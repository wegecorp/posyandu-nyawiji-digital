/**
 * Ambang klinis untuk deteksi masalah kesehatan dari data pengukuran.
 * Semua angka bersifat DRAF — siap direvisi setelah konsultasi klinis.
 *
 * Sumber utama:
 * - WHO (2021). Haemoglobin concentrations for the diagnosis of anaemia
 *   and assessment of severity. Vitamin and Mineral Nutrition Information System.
 *   Thresholds: pregnant women <11.0, non-pregnant women ≥15y <12.0,
 *   men ≥15y <13.0, children 6–59mo <11.0, 5–11y <11.5, 12–14y <12.0.
 * - Kemenkes RI (Permenkes No. 2/2020 & pedoman PTM): hipertensi ≥140/90 mmHg,
 *   gula darah puasa ≥126 mg/dL (diabetes).
 * - PERKENI (2019): gula darah ≥126 mg/dL.
 * - ATP III / Kemenkes RI: kolesterol total ≥200 mg/dL.
 * - EULAR/ACR (referensi umum): asam urat L >7.0, P >6.0 mg/dL.
 *
 * SEMUA nilai bisa diubah — file ini dirancang sebagai satu-satunya sumber
 * ambang klinis, cukup edit di sini.
 */

import type { PatientCategory } from './types';

export type IndicatorKey =
  | 'hypertension'
  | 'anemia'
  | 'highBloodSugar'
  | 'highCholesterol'
  | 'highUricAcid'
  | 'abnormalVision'
  | 'abnormalHearing';

export interface IndicatorDef {
  key: IndicatorKey;
  label: string;
  field: string | null;   // Measurement field name (null = skrining label)
  unit: string;
  appliesTo: PatientCategory[];
  /** Returns true if this measurement value is abnormal for the given context. */
  isAbnormal: (
    value: number,
    gender?: string | null,
    category?: PatientCategory | null,
  ) => boolean;
  source: string;
}

export const INDICATORS: IndicatorDef[] = [
  {
    key: 'hypertension',
    label: 'Tensi Tinggi (Hipertensi)',
    field: 'systolic',
    unit: 'mmHg',
    appliesTo: ['REMAJA', 'DEWASA', 'LANSIA', 'BUMIL'],
    // WHO/ISH + Kemenkes: Sistolik ≥140 ATAU Diastolik ≥90
    // Cutoff diperiksa via kombinasi field — di sini hanya systolic.
    // Client-side caller harus cek juga diastolic.
    isAbnormal: (val) => val >= 140,
    source: 'WHO/ISH Hypertension Guidelines 2020; Permenkes RI',
  },
  {
    key: 'anemia',
    label: 'Anemia (HB Rendah)',
    field: 'hemoglobin',
    unit: 'g/dL',
    appliesTo: ['BAYI', 'BALITA_APRAS', 'REMAJA', 'DEWASA', 'LANSIA', 'BUMIL'],
    // WHO (2021) thresholds:
    //   Bayi & Balita/Apras (<5 th): <11.0  (ponytail: 5-6 th idealnya <11.5; revisi bila perlu)
    //   Remaja (12-14 & 15-17):      <12.0
    //   Dewasa/Lansia:               wanita <12.0, pria <13.0
    //   Bumil:                       <11.0
    isAbnormal: (val, gender, category) => {
      if (category === 'BUMIL') return val < 11.0;
      if (category === 'BAYI' || category === 'BALITA_APRAS') return val < 11.0;
      if (category === 'REMAJA') return val < 12.0;
      // DEWASA & LANSIA
      return gender === 'L' ? val < 13.0 : val < 12.0;
    },
    source: 'WHO (2021) Haemoglobin concentrations for the diagnosis of anaemia.',
  },
  {
    key: 'highBloodSugar',
    label: 'Gula Darah Tinggi',
    field: 'bloodSugar',
    unit: 'mg/dL',
    appliesTo: ['REMAJA', 'DEWASA', 'LANSIA'],
    // Kemenkes RI / PERKENI (2019): GD puasa ≥126 mg/dL
    isAbnormal: (val) => val >= 126,
    source: 'PERKENI (2019); Permenkes RI',
  },
  {
    key: 'highCholesterol',
    label: 'Kolesterol Tinggi',
    field: 'cholesterol',
    unit: 'mg/dL',
    appliesTo: ['REMAJA', 'DEWASA', 'LANSIA'],
    // ATP III / Kemenkes RI: total cholesterol ≥200 mg/dL
    isAbnormal: (val) => val >= 200,
    source: 'ATP III; Kemenkes RI Pedoman Pengelolaan Dislipidemia',
  },
  {
    key: 'highUricAcid',
    label: 'Asam Urat Tinggi',
    field: 'uricAcid',
    unit: 'mg/dL',
    appliesTo: ['REMAJA', 'DEWASA', 'LANSIA'],
    // EULAR/ACR: L >7.0, P >6.0 mg/dL
    isAbnormal: (val, gender) => {
      return gender === 'L' ? val > 7.0 : val > 6.0;
    },
    source: 'EULAR/ACR gout classification criteria',
  },
  {
    key: 'abnormalVision',
    label: 'Skrining Mata Tidak Normal',
    field: null,   // skrining label, bukan field numerik
    unit: '-',
    appliesTo: ['BAYI', 'BALITA_APRAS', 'REMAJA', 'DEWASA', 'LANSIA', 'BUMIL'],
    isAbnormal: () => false, // handled khusus di checkIndicator
    source: 'Skrining standar posyandu',
  },
  {
    key: 'abnormalHearing',
    label: 'Skrining Telinga Tidak Normal',
    field: null,
    unit: '-',
    appliesTo: ['BAYI', 'BALITA_APRAS', 'REMAJA', 'DEWASA', 'LANSIA', 'BUMIL'],
    isAbnormal: () => false,
    source: 'Skrining standar posyandu',
  },
];

/**
 * Ambang buruk untuk partisipasi. Unit dengan partisipasi < ini dianggap "buruk".
 * Angka default: 50% — bisa diubah di sini.
 */
export const PARTISIPASI_BURUK_THRESHOLD = 0.5;

/** Check whether a measurement has hypertension (systolic ≥140 OR diastolic ≥90). */
export function isHypertensive(systolic?: number | null, diastolic?: number | null): boolean {
  if (systolic == null || diastolic == null) return false;
  return systolic >= 140 || diastolic >= 90;
}

/**
 * Check whether a measurement is abnormal for a given indicator.
 * Handles hypertension (both fields), skrining labels, and field-based indicators.
 */
export function checkIndicator(
  m: {
    systolic?: number | null;
    diastolic?: number | null;
    hemoglobin?: number | null;
    bloodSugar?: number | null;
    cholesterol?: number | null;
    uricAcid?: number | null;
    visionStatus?: string | null;
    hearingStatus?: string | null;
  },
  indicator: IndicatorDef,
  gender?: string | null,
  category?: PatientCategory | null,
): boolean {
  if (indicator.key === 'hypertension') {
    return isHypertensive(m.systolic, m.diastolic);
  }
  if (indicator.key === 'abnormalVision') {
    return m.visionStatus === 'Tidak Normal';
  }
  if (indicator.key === 'abnormalHearing') {
    return m.hearingStatus === 'Tidak Normal';
  }
  // Field-based indicators
  if (!indicator.field) return false;
  const raw = (m as Record<string, unknown>)[indicator.field];
  if (raw == null) return false;
  const val = Number(raw);
  if (!Number.isFinite(val)) return false;
  return indicator.isAbnormal(val, gender, category);
}

/**
 * Filter indicators applicable to a given category.
 */
export function indicatorsForCategory(category: PatientCategory): IndicatorDef[] {
  return INDICATORS.filter((ind) => ind.appliesTo.includes(category));
}
