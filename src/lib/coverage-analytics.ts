/**
 * Agregasi tambahan: cakupan ASI Eksklusif & cakupan per kelompok sasaran.
 * Murni (tanpa Prisma/React) agar bisa diuji; pengambilan data ada di route.
 */

import { getPatientCategory } from './utils';
import { ymOf } from './growth-analytics';
import type { PatientCategory } from './types';

/** Urutan tetap kategori siklus hidup Posyandu. */
export const CATEGORY_ORDER: PatientCategory[] = [
  'BAYI',
  'BALITA_APRAS',
  'REMAJA',
  'DEWASA',
  'LANSIA',
  'BUMIL',
];

export interface BreastfeedingRaw {
  posyanduId: string;
  patientId: string;
  sessionDate: Date;
  exclusiveBreastfeeding: boolean | null;
}

export interface BreastfeedingRow {
  ym: string;
  unitId: string;
  assessed: number;
  exclusive: number;
  percent: number;
}

/**
 * Cakupan ASI Eksklusif per unit per bulan.
 * Pembilang = bayi yang pada pengukuran TERAKHIR bulan itu tercatat ASI eksklusif.
 * Pembagi   = bayi yang DINILAI (punya jawaban ASI) bulan itu.
 */
export function aggregateBreastfeeding(rows: BreastfeedingRaw[]): BreastfeedingRow[] {
  const latest = new Map<string, { unitId: string; ym: string; value: boolean; t: number }>();
  for (const r of rows) {
    if (r.exclusiveBreastfeeding == null) continue;
    const ym = ymOf(r.sessionDate);
    const key = `${r.posyanduId}|${r.patientId}|${ym}`;
    const t = r.sessionDate.getTime();
    const cur = latest.get(key);
    if (!cur || t > cur.t) {
      latest.set(key, { unitId: r.posyanduId, ym, value: r.exclusiveBreastfeeding === true, t });
    }
  }

  const agg = new Map<string, { ym: string; unitId: string; assessed: number; exclusive: number }>();
  for (const v of latest.values()) {
    const key = `${v.unitId}|${v.ym}`;
    const a = agg.get(key) ?? { ym: v.ym, unitId: v.unitId, assessed: 0, exclusive: 0 };
    a.assessed++;
    if (v.value) a.exclusive++;
    agg.set(key, a);
  }

  return [...agg.values()].map((a) => ({
    ...a,
    percent: a.assessed > 0 ? Math.round((a.exclusive / a.assessed) * 100) : 0,
  }));
}

export interface BreastfeedingWithHc extends BreastfeedingRow {
  unitName: string;
  healthCenterId: string | null;
  healthCenterName: string | null;
}

export interface BreastfeedingUnitRow extends BreastfeedingRow {
  unitName: string;
}

/**
 * Rollup cakupan ASI per posyandu → per puskesmas (jumlahkan pembilang & pembagi,
 * lalu hitung ulang persen). Unit tanpa HC tak digabung ke unit lain.
 */
export function rollupBreastfeedingToHealthCenter(rows: BreastfeedingWithHc[]): BreastfeedingUnitRow[] {
  const map = new Map<string, { ym: string; unitId: string; unitName: string; assessed: number; exclusive: number }>();
  for (const r of rows) {
    const key = `${r.healthCenterId ?? 'unknown'}|${r.ym}`;
    let u = map.get(key);
    if (!u) {
      u = {
        ym: r.ym,
        unitId: r.healthCenterId ?? 'unknown',
        unitName: r.healthCenterName ?? 'Tidak diketahui',
        assessed: 0,
        exclusive: 0,
      };
      map.set(key, u);
    }
    u.assessed += r.assessed;
    u.exclusive += r.exclusive;
  }
  return [...map.values()].map((u) => ({
    ...u,
    percent: u.assessed > 0 ? Math.round((u.exclusive / u.assessed) * 100) : 0,
  }));
}

export interface CoveragePatient {
  id: string;
  createdAt: Date;
  birthDate: Date | string;
  gender?: string | null;
  isPregnant: boolean;
}

export interface CoverageMeasurement {
  patientId: string;
  sessionDate: Date;
}

export interface CategoryCoverageRow {
  ym: string;
  category: PatientCategory;
  registered: number;
  measured: number;
  totalRegistered?: number;
  totalMeasured?: number;
  percent?: number;
  sharePercent?: number;
}

/**
 * Cakupan per kelompok sasaran per bulan.
 * - Terdaftar = pasien `createdAt <= akhir bulan`; kategori dihitung pada AKHIR bulan
 *   (umur berubah seiring waktu).
 * - Terukur   = pasien unik dengan >=1 pengukuran pada bulan itu.
 */
export function categoryCoverage(
  patients: CoveragePatient[],
  measurements: CoverageMeasurement[],
  months: string[],
): CategoryCoverageRow[] {
  const measuredByYm = new Map<string, Set<string>>();
  for (const m of measurements) {
    const ym = ymOf(m.sessionDate);
    if (!measuredByYm.has(ym)) measuredByYm.set(ym, new Set());
    measuredByYm.get(ym)!.add(m.patientId);
  }

  const out: CategoryCoverageRow[] = [];
  for (const ym of months) {
    const [y, mo] = ym.split('-').map(Number);
    const monthEnd = new Date(y, mo, 0, 23, 59, 59, 999); // hari 0 bulan berikutnya = akhir bulan ini
    const measuredSet = measuredByYm.get(ym) ?? new Set<string>();

    const acc: Record<string, { reg: number; meas: number }> = {};
    for (const c of CATEGORY_ORDER) acc[c] = { reg: 0, meas: 0 };

    let totalRegistered = 0;
    let totalMeasured = 0;

    for (const p of patients) {
      const isMeasured = measuredSet.has(p.id);
      // Pasien diakui terdaftar bila createdAt <= monthEnd ATAU pasien memiliki pengukuran pada bulan tersebut (data historis/backfilled)
      if (p.createdAt.getTime() > monthEnd.getTime() && !isMeasured) continue;
      const cat = getPatientCategory(p.birthDate, p.isPregnant, p.gender, monthEnd);
      acc[cat].reg++;
      totalRegistered++;
      if (isMeasured) {
        acc[cat].meas++;
        totalMeasured++;
      }
    }

    for (const c of CATEGORY_ORDER) {
      const reg = acc[c].reg;
      const meas = acc[c].meas;
      out.push({
        ym,
        category: c,
        registered: reg,
        measured: meas,
        totalRegistered,
        totalMeasured,
        percent: reg > 0 ? Math.round((meas / reg) * 100) : 0,
        sharePercent: totalRegistered > 0 ? Math.round((reg / totalRegistered) * 100) : 0,
      });
    }
  }
  return out;
}
