import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { execSync } from 'node:child_process';

/**
 * Tes integrasi untuk pipeline yang menyentuh DB (raw query + agregasi),
 * yang TIDAK tercakup oleh tes murni. Memakai database PostgreSQL terpisah
 * (`nyawiji_test`) agar tidak mengotori data dev/produksi.
 *
 * Siapkan sekali: createdb -U postgres nyawiji_test
 * Bisa ditimpa lewat env TEST_DATABASE_URL.
 */
const TEST_DATABASE_URL = vi.hoisted(() => {
  (globalThis as { prisma?: unknown }).prisma = undefined;
  const url =
    process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/nyawiji_test?schema=public';
  process.env.DATABASE_URL = url;
  return url;
});

import { prisma } from '@/lib/prisma';
import { fetchOutcomeBase, classifyOutcomes, fetchCoverageBase } from '@/lib/analytics';
import { recomputePatientWeightProgression } from '@/lib/weight-progression-db';

async function makePosyandu(suffix: string): Promise<string> {
  const kap = await prisma.kapanewon.create({ data: { code: `KAP-${suffix}`, name: `Kapanewon ${suffix}` } });
  const kal = await prisma.kalurahan.create({
    data: { code: `KAL-${suffix}`, name: `Kalurahan ${suffix}`, kapanewonId: kap.id },
  });
  const hc = await prisma.healthCenter.create({
    data: { code: `HC-${suffix}`, name: `Puskesmas ${suffix}`, kapanewonId: kap.id },
  });
  const pos = await prisma.posyandu.create({
    data: {
      code: `POS-${suffix}`,
      name: `Posyandu ${suffix}`,
      kalurahanId: kal.id,
      healthCenterId: hc.id,
    },
  });
  return pos.id;
}

async function makePatient(
  posyanduId: string,
  suffix: string,
  birthDate: string,
  createdAt: string,
): Promise<string> {
  const p = await prisma.patient.create({
    data: {
      regNumber: `REG-${suffix}`,
      name: `Pasien ${suffix}`,
      birthDate: new Date(`${birthDate}T00:00:00`),
      gender: 'L',
      posyanduId,
      createdAt: new Date(`${createdAt}T00:00:00`),
    },
  });
  return p.id;
}

async function addMeasurement(
  patientId: string,
  posyanduId: string,
  sessionDate: string,
  data: Record<string, unknown> = {},
): Promise<string> {
  const m = await prisma.measurement.create({
    data: {
      patientId,
      posyanduId,
      sessionDate: new Date(`${sessionDate}T08:00:00`),
      ageInMonths: 12,
      category: 'BALITA_APRAS',
      ...data,
    },
  });
  return m.id;
}

beforeAll(async () => {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'ignore',
  });
  await prisma.$connect();
  await prisma.measurement.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.posyandu.deleteMany();
  await prisma.healthCenter.deleteMany();
  await prisma.kalurahan.deleteMany();
  await prisma.kapanewon.deleteMany();
}, 120_000);

afterAll(async () => {
  await prisma.$disconnect();
});

describe('fetchOutcomeBase + classifyOutcomes (DB nyata)', () => {
  it('dedupe per pasien, pisahkan belum-dinilai, hormati appliesTo', async () => {
    const pos = await makePosyandu('OUT');

    // A: dua ukur Januari; terakhir punya HB normal → Normal (dedupe ambil terakhir).
    const a = await makePatient(pos, 'OUT-A', '2020-01-15', '2025-12-01');
    await addMeasurement(a, pos, '2026-01-05', { weight: 8 });
    await addMeasurement(a, pos, '2026-01-20', { weight: 8.5, hemoglobin: 13 });

    // F: hanya BB/TB, tanpa indikator klinis → Belum Dinilai.
    const f = await makePatient(pos, 'OUT-F', '2020-01-15', '2025-12-01');
    await addMeasurement(f, pos, '2026-01-10', { weight: 9, height: 70 });

    // B: anemia (BALITA_APRAS, HB < 11) → Tidak Normal.
    const b = await makePatient(pos, 'OUT-B', '2020-01-15', '2025-12-01');
    await addMeasurement(b, pos, '2026-01-12', { hemoglobin: 8 });

    // C: hipertensi (DEWASA) → Tidak Normal.
    const c = await makePatient(pos, 'OUT-C', '1980-01-15', '2025-12-01');
    await addMeasurement(c, pos, '2026-01-12', { category: 'DEWASA', systolic: 160, diastolic: 100 });

    // D: gula darah tinggi pada BALITA_APRAS → di luar appliesTo → Belum Dinilai.
    const d = await makePatient(pos, 'OUT-D', '2020-01-15', '2025-12-01');
    await addMeasurement(d, pos, '2026-01-13', { bloodSugar: 200 });

    const rows = await fetchOutcomeBase('2026-01-01', '2026-01-31');
    const { totals } = classifyOutcomes(rows);
    const jan = totals.find((t) => t.ym === '2026-01');

    expect(jan).toBeDefined();
    expect(jan!.total).toBe(5);
    expect(jan!.normal).toBe(1);
    expect(jan!.abnormal).toBe(2);
    expect(jan!.notAssessed).toBe(2);
    expect(jan!.abnormalByIndicator.anemia).toBe(1);
    expect(jan!.abnormalByIndicator.hypertension).toBe(1);
  });
});

describe('fetchCoverageBase (denominator historis)', () => {
  it('denominator bulan lampau hanya menghitung pasien yang sudah terdaftar saat itu', async () => {
    const pos = await makePosyandu('COV');

    // X terdaftar Juni 2025, diukur Juli 2025.
    const x = await makePatient(pos, 'COV-X', '2020-01-15', '2025-06-15');
    await addMeasurement(x, pos, '2025-07-10', { weight: 8 });
    // Y baru terdaftar Januari 2026, diukur Januari 2026.
    const y = await makePatient(pos, 'COV-Y', '2023-01-15', '2026-01-15');
    await addMeasurement(y, pos, '2026-01-20', { weight: 9 });

    const rows = await fetchCoverageBase('2025-07-01', '2026-01-31');
    const jul = rows.find((r) => r.unitId === pos && r.ym === '2025-07');
    const jan = rows.find((r) => r.unitId === pos && r.ym === '2026-01');

    expect(jul).toBeDefined();
    expect(jul!.numerator).toBe(1);
    expect(jul!.denominator).toBe(1); // Y belum terdaftar pada Juli 2025
    expect(jan).toBeDefined();
    expect(jan!.numerator).toBe(1);
    expect(jan!.denominator).toBe(2); // X + Y sudah terdaftar pada Jan 2026
  });
});

describe('recomputePatientWeightProgression (rantai N/T & 2T)', () => {  it('menandai N/T/2T dan menghitung ulang setelah edit pengukuran lama', async () => {
    const pos = await makePosyandu('WP');
    const z = await makePatient(pos, 'WP-Z', '2023-01-15', '2026-01-15');
    const m1 = await addMeasurement(z, pos, '2026-02-10', { weight: 8.0 });
    await addMeasurement(z, pos, '2026-03-10', { weight: 8.2 });
    await addMeasurement(z, pos, '2026-04-10', { weight: 8.2 });
    await addMeasurement(z, pos, '2026-05-10', { weight: 8.1 });

    await recomputePatientWeightProgression(z);

    let rows = await prisma.measurement.findMany({ where: { patientId: z }, orderBy: { sessionDate: 'asc' } });
    expect(rows.map((r) => r.weightStatus)).toEqual([null, 'NAIK', 'TIDAK_NAIK', 'TIDAK_NAIK']);
    expect(rows.map((r) => r.weightFaltering2T)).toEqual([false, false, false, true]);
    expect(rows[1].weightGain).toBeCloseTo(0.2, 5);

    // Edit pengukuran PERTAMA: 8.0 → 9.0. Rantai setelahnya harus dihitung ulang.
    await prisma.measurement.update({ where: { id: m1 }, data: { weight: 9.0 } });
    await recomputePatientWeightProgression(z);

    rows = await prisma.measurement.findMany({ where: { patientId: z }, orderBy: { sessionDate: 'asc' } });
    expect(rows.map((r) => r.weightStatus)).toEqual([null, 'TIDAK_NAIK', 'TIDAK_NAIK', 'TIDAK_NAIK']);
    expect(rows.map((r) => r.weightFaltering2T)).toEqual([false, false, true, true]);
  });

  it('di luar cakupan KMS (remaja/dewasa) → N/T & 2T null', async () => {
    const pos = await makePosyandu('WP-REM');
    // Lahir 2013-01 → usia ~13 th (REMAJA) pada sesi 2026.
    const z = await makePatient(pos, 'WP-REM', '2013-01-15', '2026-01-15');
    await addMeasurement(z, pos, '2026-02-10', { weight: 45.0 });
    await addMeasurement(z, pos, '2026-03-10', { weight: 44.0 });
    await addMeasurement(z, pos, '2026-04-10', { weight: 43.0 });

    await recomputePatientWeightProgression(z);

    const rows = await prisma.measurement.findMany({ where: { patientId: z }, orderBy: { sessionDate: 'asc' } });
    // KMS hanya umur 0-60 bln → di luar itu N/T tak dihitung sama sekali.
    expect(rows.map((r) => r.weightStatus)).toEqual([null, null, null]);
    expect(rows.every((r) => r.weightFaltering2T === false)).toBe(true);
  });

  it('batas KMS 60 bln: umur 61 bln tidak lagi dinilai', async () => {
    const pos = await makePosyandu('WP-APRAS');
    // Lahir 2021-03-05: sesi 2026-01-10 = 58 bln, 02-10 = 59, 03-10 = 60, 04-10 = 61.
    const z = await makePatient(pos, 'WP-APRAS', '2021-03-05', '2026-01-15');
    await addMeasurement(z, pos, '2026-01-10', { weight: 18.0 });
    await addMeasurement(z, pos, '2026-02-10', { weight: 18.0 });
    await addMeasurement(z, pos, '2026-03-10', { weight: 18.0 });
    await addMeasurement(z, pos, '2026-04-10', { weight: 18.0 });

    await recomputePatientWeightProgression(z);

    const rows = await prisma.measurement.findMany({ where: { patientId: z }, orderBy: { sessionDate: 'asc' } });
    expect(rows.map((r) => r.weightStatus)).toEqual([null, 'TIDAK_NAIK', 'TIDAK_NAIK', null]);
    expect(rows.map((r) => r.weightFaltering2T)).toEqual([false, false, true, false]);
  });
});

describe('konversi bulan lintas zona waktu (Asia/Jakarta)', () => {
  it('sesi tanggal 1 pukul 00:00 lokal tidak tergeser ke bulan sebelumnya', async () => {
    const pos = await makePosyandu('TZ');
    const p = await makePatient(pos, 'TZ-A', '2020-01-15', '2025-12-01');
    // 1 Maret 2026 00:00 waktu lokal (WIB) = 28 Feb 17:00 UTC.
    // Query SQLite lama (`unixepoch`,`localtime`) dan `to_char(... Asia/Jakarta)`
    // harus sama-sama menghasilkan '2026-03', bukan '2026-02'.
    await prisma.measurement.create({
      data: {
        patientId: p,
        posyanduId: pos,
        sessionDate: new Date(2026, 2, 1, 0, 0, 0),
        ageInMonths: 12,
        category: 'BALITA_APRAS',
        weight: 8,
      },
    });

    const rows = await fetchCoverageBase('2026-03-01', '2026-03-31');
    const mar = rows.find((r) => r.unitId === pos && r.ym === '2026-03');

    expect(mar).toBeDefined();
    expect(mar!.numerator).toBe(1);
  });
});
