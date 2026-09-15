import type { PatientCategory } from './types';

export interface RangeRule {
  min: number;
  max: number;
  label: string;
  unit: string;
}

export const MEASUREMENT_RANGES: Record<string, RangeRule> = {
  weight: { min: 0.5, max: 300, label: 'Berat Badan', unit: 'kg' },
  height: { min: 40, max: 250, label: 'Tinggi Badan', unit: 'cm' },
  headCircumference: { min: 20, max: 75, label: 'Lingkar Kepala', unit: 'cm' },
  armCircumference: { min: 5, max: 60, label: 'LiLA', unit: 'cm' },
  waistCircumference: { min: 30, max: 250, label: 'Lingkar Perut', unit: 'cm' },
  systolic: { min: 40, max: 260, label: 'Tensi Sistolik', unit: 'mmHg' },
  diastolic: { min: 20, max: 200, label: 'Tensi Diastolik', unit: 'mmHg' },
  gestationalAge: { min: 0, max: 45, label: 'Usia Kehamilan', unit: 'minggu' },
  bloodSugar: { min: 20, max: 600, label: 'Gula Darah', unit: 'mg/dL' },
  cholesterol: { min: 50, max: 600, label: 'Kolesterol', unit: 'mg/dL' },
  uricAcid: { min: 0.5, max: 20, label: 'Asam Urat', unit: 'mg/dL' },
  hemoglobin: { min: 2, max: 25, label: 'Hemoglobin', unit: 'g/dL' },
};

export interface FieldValidation {
  valid: boolean;
  message: string | null;
}

// raw: string dari input. Kosong = valid (nilai tidak wajib).
export function validateMeasurementValue(field: string, raw: string | null | undefined): FieldValidation {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { valid: true, message: null };
  }

  const rule = MEASUREMENT_RANGES[field];
  if (!rule) {
    return { valid: true, message: null };
  }

  const num = Number(raw);
  if (!Number.isFinite(num)) {
    return { valid: false, message: `${rule.label} harus berupa angka` };
  }

  if (num < rule.min || num > rule.max) {
    return {
      valid: false,
      message: `${rule.label} di luar batas wajar (${rule.min}–${rule.max} ${rule.unit})`,
    };
  }

  return { valid: true, message: null };
}

export function validateBloodPressure(
  systolic: string | null | undefined,
  diastolic: string | null | undefined
): FieldValidation {
  if (!systolic || !diastolic || String(systolic).trim() === '' || String(diastolic).trim() === '') {
    return { valid: true, message: null };
  }
  const sys = Number(systolic);
  const dia = Number(diastolic);
  if (Number.isFinite(sys) && Number.isFinite(dia) && sys <= dia) {
    return { valid: false, message: 'Sistolik harus lebih besar dari Diastolik' };
  }
  return { valid: true, message: null };
}

export function computeImt(
  weight: string | number | null | undefined,
  height: string | number | null | undefined
): number | null {
  const w = typeof weight === 'number' ? weight : Number(weight);
  const h = typeof height === 'number' ? height : Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return null;
  }
  const hMeter = h / 100;
  return Math.round((w / (hMeter * hMeter)) * 10) / 10;
}

export function validateBirthDate(value: string | null | undefined): FieldValidation {
  if (!value) return { valid: false, message: 'Tanggal lahir wajib diisi' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { valid: false, message: 'Tanggal lahir tidak valid' };
  if (d.getTime() > Date.now()) return { valid: false, message: 'Tanggal lahir tidak boleh di masa depan' };
  if (d.getFullYear() < 1900) return { valid: false, message: 'Tanggal lahir di luar rentang wajar' };
  return { valid: true, message: null };
}

export function validatePhone(value: string | null | undefined): FieldValidation {
  if (!value || String(value).trim() === '') return { valid: true, message: null };
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return { valid: false, message: 'Nomor HP harus 8–15 digit' };
  }
  return { valid: true, message: null };
}

export function validateTextLength(
  value: string | null | undefined,
  label: string,
  max: number
): FieldValidation {
  if (value != null && String(value).length > max) {
    return { valid: false, message: `${label} maksimal ${max} karakter` };
  }
  return { valid: true, message: null };
}

// Pengukuran dianggap lengkap bila BB & TB (wajib untuk semua kategori) terisi.
export function isMeasurementComplete(m: {
  weight?: number | null;
  height?: number | null;
} | null | undefined): boolean {
  if (!m) return false;
  return m.weight != null && m.height != null;
}

/**
 * Field yang dihitung untuk progres kelengkapan data, per kategori umur.
 * ponytail: definisi per kategori masih draf (BB & TB untuk semua). Revisi
 * lanjutan cukup mengubah map ini — persen & filter ikut otomatis.
 */
const COMPLETION_FIELDS: Record<PatientCategory, string[]> = {
  BAYI: ['weight', 'height'],
  BALITA_APRAS: ['weight', 'height'],
  REMAJA: ['weight', 'height'],
  DEWASA: ['weight', 'height'],
  LANSIA: ['weight', 'height'],
  BUMIL: ['weight', 'height'],
};

export function completionFieldsFor(category: PatientCategory): string[] {
  return COMPLETION_FIELDS[category] ?? ['weight', 'height'];
}

/** Persen field terisi (0-100) untuk satu pengukuran + kategori. */
export function measurementCompletion(
  m: Record<string, unknown> | null | undefined,
  category: PatientCategory,
): { filled: number; total: number; percent: number } {
  const fields = completionFieldsFor(category);
  if (!m) return { filled: 0, total: fields.length, percent: 0 };
  let filled = 0;
  for (const f of fields) {
    const v = m[f];
    if (v != null && v !== '') filled++;
  }
  return {
    filled,
    total: fields.length,
    percent: fields.length > 0 ? Math.round((filled / fields.length) * 100) : 0,
  };
}
