/**
 * Engine status gizi balita (0-60 bulan) — Standar Antropometri Anak,
 * Permenkes No. 2 Tahun 2020.
 *
 * Alur:
 *   1. hitung umur (bulan penuh) dari tanggal lahir → tanggal sesi
 *   2. koreksi panjang/tinggi badan (aturan ±0,7 cm)
 *   3. hitung Z-score per indeks (piecewise pada 7 garis SD Permenkes)
 *   4. klasifikasikan Z → kategori
 *
 * Modul ini murni (tanpa Prisma / React) sehingga dipakai server & klien.
 */

import {
  referenceAt,
  tableFor,
  zFromReference,
  GROWTH_REF_VERSION,
  type GrowthIndex,
  type Sex,
} from './tables';
import { classifyZ, type GrowthCategory } from './categories';

export * from './tables';
export * from './categories';
export * from './weight-progression';

/** Cara balita diukur. TELENTANG = panjang badan (PB), BERDIRI = tinggi (TB). */
export type StaturePosition = 'TELENTANG' | 'BERDIRI';

export interface GrowthInput {
  gender?: string | null;
  birthDate: string | Date;
  sessionDate?: string | Date | null;
  weight?: number | null;
  height?: number | null;
  position?: StaturePosition | null;
}

export interface IndexResult {
  z: number;
  categoryKey: string;
  label: string;
  color: string;
}

export interface GrowthResult {
  ok: boolean;
  reason?: 'gender' | 'age' | 'no-data';
  gender?: Sex;
  ageMonths: number;
  position?: StaturePosition;
  correctedStature?: number | null;
  refVersion: string;
  BB_U?: IndexResult;
  TB_U?: IndexResult;
  BB_TB?: IndexResult;
  IMT_U?: IndexResult;
}

/** Umur dalam bulan penuh ("2 bln 29 hari" = 2 bulan), relatif ke tanggal sesi. */
export function ageInCompletedMonths(
  birthDate: string | Date,
  sessionDate: string | Date = new Date(),
): number {
  const b = new Date(birthDate);
  const s = new Date(sessionDate);
  let months = (s.getFullYear() - b.getFullYear()) * 12 + (s.getMonth() - b.getMonth());
  if (s.getDate() < b.getDate()) months--;
  return months < 0 ? 0 : months;
}

/** Posisi ukur default: <24 bln telentang (PB), ≥24 bln berdiri (TB). */
export function defaultPosition(ageMonths: number): StaturePosition {
  return ageMonths < 24 ? 'TELENTANG' : 'BERDIRI';
}

/**
 * Koreksi panjang/tinggi badan (Permenkes 2/2020, Lampiran Bab II):
 * - umur <24 bln diukur berdiri → +0,7 cm
 * - umur ≥24 bln diukur telentang → −0,7 cm
 */
export function correctedLengthHeight(
  ageMonths: number,
  position: StaturePosition,
  value: number,
): number {
  if (ageMonths < 24) return position === 'BERDIRI' ? value + 0.7 : value;
  return position === 'TELENTANG' ? value - 0.7 : value;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round(v: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
}

function computeIndex(
  index: GrowthIndex,
  sex: Sex,
  ageMonths: number,
  measure: number,
  keyValue: number,
): IndexResult {
  const { table, keyType } = tableFor(index, sex, ageMonths);
  const ref = referenceAt(table, sex, keyType === 'ageMonths' ? ageMonths : keyValue);
  const zRaw = zFromReference(measure, ref);
  const z = round(zRaw, 2);
  const cat: GrowthCategory = classifyZ(index, z);
  return { z, categoryKey: cat.key, label: cat.label, color: cat.color };
}

/**
 * Hitung status gizi lengkap (BB/U, TB/U, BB/TB, IMT/U) untuk satu balita.
 * Mengembalikan `ok:false` bila jenis kelamin tak diketahui, umur di luar
 * 0-60 bulan, atau tak ada BB/TB sama sekali.
 */
export function computeGrowth(input: GrowthInput): GrowthResult {
  const session = input.sessionDate ? new Date(input.sessionDate) : new Date();
  const ageMonths = ageInCompletedMonths(input.birthDate, session);
  const sex: Sex | null = input.gender === 'L' ? 'L' : input.gender === 'P' ? 'P' : null;

  const base: GrowthResult = { ok: false, ageMonths, refVersion: GROWTH_REF_VERSION };

  if (!sex) return { ...base, reason: 'gender' };
  if (ageMonths > 60) return { ...base, reason: 'age', gender: sex };

  const weight = num(input.weight);
  const height = num(input.height);
  const position = input.position ?? defaultPosition(ageMonths);
  const stature = height != null ? round(correctedLengthHeight(ageMonths, position, height), 1) : null;

  const result: GrowthResult = {
    ok: true,
    ageMonths,
    gender: sex,
    position,
    correctedStature: stature,
    refVersion: GROWTH_REF_VERSION,
  };

  if (weight != null) {
    result.BB_U = computeIndex('BB_U', sex, ageMonths, weight, weight);
  }
  if (stature != null) {
    result.TB_U = computeIndex('TB_U', sex, ageMonths, stature, stature);
  }
  if (weight != null && stature != null) {
    result.BB_TB = computeIndex('BB_TB', sex, ageMonths, weight, stature);
    const bmi = round(weight / Math.pow(stature / 100, 2), 2);
    result.IMT_U = computeIndex('IMT_U', sex, ageMonths, bmi, bmi);
  }

  if (weight == null && stature == null) {
    return { ...result, ok: false, reason: 'no-data' };
  }
  return result;
}

/** Ambil hasil indeks tertentu dari GrowthResult. */
export function indexResult(res: GrowthResult, index: GrowthIndex): IndexResult | undefined {
  return res[index];
}
