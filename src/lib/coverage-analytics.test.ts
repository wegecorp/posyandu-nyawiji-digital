import { describe, it, expect } from 'vitest';
import {
  aggregateBreastfeeding,
  categoryCoverage,
  rollupBreastfeedingToHealthCenter,
  type CoveragePatient,
} from './coverage-analytics';

describe('aggregateBreastfeeding', () => {
  it('ambil pengukuran terakhir per pasien per bulan, hitung persen dari yang dinilai', () => {
    const rows = aggregateBreastfeeding([
      // p1: Jan Ya lalu Tidak (terakhir) → dinilai, tidak eksklusif
      { posyanduId: 'a', patientId: 'p1', sessionDate: new Date('2026-01-05T08:00:00'), exclusiveBreastfeeding: true },
      { posyanduId: 'a', patientId: 'p1', sessionDate: new Date('2026-01-20T08:00:00'), exclusiveBreastfeeding: false },
      // p2: Jan Ya
      { posyanduId: 'a', patientId: 'p2', sessionDate: new Date('2026-01-10T08:00:00'), exclusiveBreastfeeding: true },
      // p3: tanpa jawaban → tidak dihitung
      { posyanduId: 'a', patientId: 'p3', sessionDate: new Date('2026-01-10T08:00:00'), exclusiveBreastfeeding: null },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ym: '2026-01', unitId: 'a', assessed: 2, exclusive: 1, percent: 50 });
  });

  it('pisah per bulan & per unit', () => {
    const rows = aggregateBreastfeeding([
      { posyanduId: 'a', patientId: 'p1', sessionDate: new Date('2026-01-05T08:00:00'), exclusiveBreastfeeding: true },
      { posyanduId: 'b', patientId: 'p1', sessionDate: new Date('2026-01-05T08:00:00'), exclusiveBreastfeeding: false },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.unitId === 'a')!.percent).toBe(100);
    expect(rows.find((r) => r.unitId === 'b')!.percent).toBe(0);
  });
});

describe('rollupBreastfeedingToHealthCenter', () => {
  it('gabungkan posyandu per puskesmas & hitung ulang persen', () => {
    const rows = rollupBreastfeedingToHealthCenter([
      { ym: '2026-01', unitId: 'posA', unitName: 'A', assessed: 4, exclusive: 2, percent: 50, healthCenterId: 'hc1', healthCenterName: 'HC 1' },
      { ym: '2026-01', unitId: 'posB', unitName: 'B', assessed: 6, exclusive: 1, percent: 17, healthCenterId: 'hc1', healthCenterName: 'HC 1' },
      { ym: '2026-01', unitId: 'posC', unitName: 'C', assessed: 2, exclusive: 2, percent: 100, healthCenterId: 'hc2', healthCenterName: 'HC 2' },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.unitId === 'hc1')).toMatchObject({ assessed: 10, exclusive: 3, percent: 30 });
    expect(rows.find((r) => r.unitId === 'hc2')).toMatchObject({ assessed: 2, exclusive: 2, percent: 100 });
  });
});

describe('categoryCoverage', () => {
  const patients: CoveragePatient[] = [
    // bayi (lahir Jan 2026) → pada Jan 2026 = 0 bln → BAYI
    { id: 'b1', createdAt: new Date('2026-01-01T00:00:00'), birthDate: '2026-01-10', gender: 'L', isPregnant: false },
    // balita (lahir 2024) → BALITA_APRAS
    { id: 'c1', createdAt: new Date('2025-06-01T00:00:00'), birthDate: '2024-06-01', gender: 'P', isPregnant: false },
  ];
  const measurements = [
    { patientId: 'b1', sessionDate: new Date('2026-01-15T08:00:00') },
    { patientId: 'c1', sessionDate: new Date('2026-01-20T08:00:00') },
  ];

  it('hitung terdaftar & terukur per kategori pada akhir bulan', () => {
    const rows = categoryCoverage(patients, measurements, ['2026-01']);
    const bayi = rows.find((r) => r.category === 'BAYI')!;
    const balita = rows.find((r) => r.category === 'BALITA_APRAS')!;
    expect(bayi).toMatchObject({ registered: 1, measured: 1, totalRegistered: 2, totalMeasured: 2, percent: 100, sharePercent: 50 });
    expect(balita).toMatchObject({ registered: 1, measured: 1, totalRegistered: 2, totalMeasured: 2, percent: 100, sharePercent: 50 });
    // kategori lain kosong
    expect(rows.find((r) => r.category === 'LANSIA')).toMatchObject({ registered: 0, measured: 0, totalRegistered: 2, totalMeasured: 2, percent: 0, sharePercent: 0 });
  });

  it('pasien belum terdaftar pada bulan lampau tidak dihitung', () => {
    const rows = categoryCoverage(patients, [], ['2025-01']);
    const bayi = rows.find((r) => r.category === 'BAYI')!;
    expect(bayi.registered).toBe(0);
    expect(rows.find((r) => r.category === 'BALITA_APRAS')!.registered).toBe(0);
  });
});
