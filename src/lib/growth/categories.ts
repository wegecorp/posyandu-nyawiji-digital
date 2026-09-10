/**
 * Kategori & ambang batas status gizi anak usia 0-60 bulan.
 * Persis Permenkes No. 2 Tahun 2020, Lampiran Bab II.B (hal. 14).
 *
 * Warna mengikuti konvensi KMS: hijau = normal, kuning = kurang/risiko,
 * oranye = lebih, merah = buruk. KMS resmi hanya mewarnai grafik BB/U;
 * palet di bawah memperluas semantik itu ke BB/TB & IMT/U.
 */

import type { GrowthIndex } from './tables';

export interface GrowthCategory {
  key: string;
  label: string;
  labelEn: string;
  /** Warna hex untuk UI. */
  color: string;
  /** Batas bawah (inklusif) untuk legenda; -Infinity untuk kategori terbawah. */
  min: number;
  /** Batas atas (eksklusif kecuali kategori teratas); Infinity untuk teratas. */
  max: number;
}

export const GROWTH_CATEGORIES: Record<GrowthIndex, GrowthCategory[]> = {
  BB_U: [
    { key: 'severely_underweight', label: 'Berat Badan Sangat Kurang', labelEn: 'Severely Underweight', color: '#ef4444', min: -Infinity, max: -3 },
    { key: 'underweight', label: 'Berat Badan Kurang', labelEn: 'Underweight', color: '#f59e0b', min: -3, max: -2 },
    { key: 'normal', label: 'Berat Badan Normal', labelEn: 'Normal', color: '#22c55e', min: -2, max: 1 },
    { key: 'risk_overweight', label: 'Risiko Berat Badan Lebih', labelEn: 'Risk of Overweight', color: '#eab308', min: 1, max: Infinity },
  ],
  TB_U: [
    { key: 'severely_stunted', label: 'Sangat Pendek', labelEn: 'Severely Stunted', color: '#ef4444', min: -Infinity, max: -3 },
    { key: 'stunted', label: 'Pendek', labelEn: 'Stunted', color: '#f59e0b', min: -3, max: -2 },
    { key: 'normal', label: 'Normal', labelEn: 'Normal', color: '#22c55e', min: -2, max: 3 },
    { key: 'tall', label: 'Tinggi', labelEn: 'Tall', color: '#3b82f6', min: 3, max: Infinity },
  ],
  BB_TB: [
    { key: 'severely_wasted', label: 'Gizi Buruk', labelEn: 'Severely Wasted', color: '#ef4444', min: -Infinity, max: -3 },
    { key: 'wasted', label: 'Gizi Kurang', labelEn: 'Wasted', color: '#f59e0b', min: -3, max: -2 },
    { key: 'normal', label: 'Gizi Baik', labelEn: 'Normal', color: '#22c55e', min: -2, max: 1 },
    { key: 'risk_overweight', label: 'Berisiko Gizi Lebih', labelEn: 'Possible Risk of Overweight', color: '#eab308', min: 1, max: 2 },
    { key: 'overweight', label: 'Gizi Lebih', labelEn: 'Overweight', color: '#f97316', min: 2, max: 3 },
    { key: 'obese', label: 'Obesitas', labelEn: 'Obese', color: '#dc2626', min: 3, max: Infinity },
  ],
  IMT_U: [
    { key: 'severely_wasted', label: 'Gizi Buruk', labelEn: 'Severely Wasted', color: '#ef4444', min: -Infinity, max: -3 },
    { key: 'wasted', label: 'Gizi Kurang', labelEn: 'Wasted', color: '#f59e0b', min: -3, max: -2 },
    { key: 'normal', label: 'Gizi Baik', labelEn: 'Normal', color: '#22c55e', min: -2, max: 1 },
    { key: 'risk_overweight', label: 'Berisiko Gizi Lebih', labelEn: 'Possible Risk of Overweight', color: '#eab308', min: 1, max: 2 },
    { key: 'overweight', label: 'Gizi Lebih', labelEn: 'Overweight', color: '#f97316', min: 2, max: 3 },
    { key: 'obese', label: 'Obesitas', labelEn: 'Obese', color: '#dc2626', min: 3, max: Infinity },
  ],
};

/**
 * Klasifikasi Z-score → kategori. Batas mengikuti teks Permenkes:
 * normal BB/U & BB/TB `-2 s.d. +1`, BB/TB berisiko `>+1 s.d. +2`,
 * gizi lebih `>+2 s.d. +3`, obesitas `>+3`, TB/U normal `-2 s.d. +3`.
 */
export function classifyZ(index: GrowthIndex, z: number): GrowthCategory {
  const cats = GROWTH_CATEGORIES[index];
  if (!Number.isFinite(z)) return cats.find((c) => c.key === 'normal')!;

  if (z < -3) return cats[0];
  if (z < -2) return cats[1];

  // Mulai dari +1 ke atas, tiap indeks punya jumlah kategori berbeda.
  const upper = cats.slice(2);
  if (index === 'BB_U') {
    // normal -2..+1 ; risk >+1
    return z <= 1 ? upper[0] : upper[1];
  }
  if (index === 'TB_U') {
    // normal -2..+3 ; tall >+3
    return z <= 3 ? upper[0] : upper[1];
  }
  // BB_TB & IMT_U: normal <=1 ; risk <=2 ; overweight <=3 ; obese >3
  if (z <= 1) return upper[0];
  if (z <= 2) return upper[1];
  if (z <= 3) return upper[2];
  return upper[3];
}

/** Label & warna dari kategori berdasarkan key (untuk data tersimpan). */
export function findCategory(index: GrowthIndex, key: string): GrowthCategory | undefined {
  return GROWTH_CATEGORIES[index].find((c) => c.key === key);
}

/**
 * Kategori versi survei/cakupan program (Permenkes catatan kaki):
 * "berisiko gizi lebih", "risiko berat badan lebih", dan "tinggi"
 * tidak dipakai untuk hasil survei — digabung ke kategori normal.
 */
export function surveyCategoryKey(index: GrowthIndex, key: string): string {
  if (key === 'risk_overweight' || key === 'tall') return 'normal';
  return key;
}

/** Kategori utama untuk ringkasan pasien (prioritas stunting → wasting → BB). */
export const PRIMARY_INDEX: GrowthIndex = 'TB_U';
