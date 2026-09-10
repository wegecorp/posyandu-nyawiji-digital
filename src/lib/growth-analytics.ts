/**
 * Agregasi status gizi balita untuk dashboard (berbasis Permenkes 2/2020).
 *
 * Semua fungsi di sini murni terhadap array; pengambilan data ada di route.
 * Status dihitung ulang dari BB/TB mentah (tidak bergantung kolom tersimpan),
 * sehingga data lama pun tetap terbaca.
 */

import {
  computeGrowth,
  findCategory,
  GROWTH_CATEGORIES,
  surveyCategoryKey,
  type GrowthIndex,
  type StaturePosition,
} from './growth';
import { ageInCompletedMonths } from './growth';

export interface GrowthMeasureRow {
  patientId: string;
  posyanduId: string;
  sessionDate: Date;
  weight: number | null;
  height: number | null;
  position: string | null;
  gender: string | null;
  birthDate: Date;
}

export interface GrowthPatientRow {
  id: string;
  posyanduId: string;
  gender: string | null;
  birthDate: Date;
}

export interface CategoryCount {
  key: string;
  label: string;
  color: string;
  count: number;
  percent: number;
}

function toPosition(p: string | null): StaturePosition | undefined {
  return p === 'TELENTANG' || p === 'BERDIRI' ? p : undefined;
}

/** Ambil pengukuran terakhir per anak dalam himpunan (dedupe). */
export function latestPerPatient(rows: GrowthMeasureRow[]): GrowthMeasureRow[] {
  const map = new Map<string, GrowthMeasureRow>();
  for (const r of rows) {
    const cur = map.get(r.patientId);
    if (!cur || r.sessionDate.getTime() > cur.sessionDate.getTime()) map.set(r.patientId, r);
  }
  return [...map.values()];
}

/** Kategori status gizi (versi cakupan program) untuk satu himpunan ukur. */
export function statusCounts(
  rows: GrowthMeasureRow[],
  indicator: GrowthIndex,
): { total: number; categories: CategoryCount[] } {
  const counts = new Map<string, number>();
  let total = 0;

  for (const r of rows) {
    const res = computeGrowth({
      gender: r.gender,
      birthDate: r.birthDate,
      sessionDate: r.sessionDate,
      weight: r.weight,
      height: r.height,
      position: toPosition(r.position),
    });
    const idx = res[indicator];
    if (!idx) continue;
    const key = surveyCategoryKey(indicator, idx.categoryKey);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total++;
  }

  const categories: CategoryCount[] = [];
  for (const def of GROWTH_CATEGORIES[indicator]) {
    const key = surveyCategoryKey(indicator, def.key);
    if (key !== def.key) continue; // kategori yang digabung ke normal (risiko/tinggi)
    const count = counts.get(key) ?? 0;
    categories.push({
      key,
      label: def.label,
      color: def.color,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    });
  }

  return { total, categories };
}

/** Kunci bulan lokal 'YYYY-MM'. */
export function ymOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Tren status per bulan (dedupe per anak per bulan). */
export function statusTrend(
  rows: GrowthMeasureRow[],
  indicator: GrowthIndex,
): Array<{ ym: string; total: number; categories: CategoryCount[] }> {
  const byMonth = new Map<string, GrowthMeasureRow[]>();
  for (const r of rows) {
    const ym = ymOf(r.sessionDate);
    if (!byMonth.has(ym)) byMonth.set(ym, []);
    byMonth.get(ym)!.push(r);
  }
  return [...byMonth.keys()]
    .sort()
    .map((ym) => {
      const deduped = latestPerPatient(byMonth.get(ym)!);
      const { total, categories } = statusCounts(deduped, indicator);
      return { ym, total, categories };
    });
}

/** Prevalensi kategori "masalah" (semua kecuali normal) per bulan, dalam persen. */
export function problemRate(categories: CategoryCount[]): number {
  const nonNormal = categories
    .filter((c) => c.key !== 'normal')
    .reduce((acc, c) => acc + c.count, 0);
  const total = categories.reduce((acc, c) => acc + c.count, 0);
  return total > 0 ? (nonNormal / total) * 100 : 0;
}

/** Id balita terdaftar (umur 0-60 bulan pada tanggal acuan). */
export function registeredBalitaIds(patients: GrowthPatientRow[], asOf: Date): Set<string> {
  const ids = new Set<string>();
  for (const p of patients) {
    const age = ageInCompletedMonths(p.birthDate, asOf);
    if (age >= 0 && age <= 60) ids.add(p.id);
  }
  return ids;
}

/** Label kategori untuk sebuah key (fallback ke key mentah). */
export function categoryLabel(index: GrowthIndex, key: string): string {
  return findCategory(index, key)?.label ?? key;
}
