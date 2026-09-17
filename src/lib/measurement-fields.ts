/**
 * Satu sumber kebenaran: field pengukuran apa yang berlaku untuk tiap
 * kelompok sasaran (kategori siklus hidup). Dipakai form pengukuran agar
 * kolom yang tampil sesuai umur/sasaran — bayi tak melihat kolesterol, dst.
 *
 * Field klinis DITURUNKAN dari `INDICATORS.appliesTo` (clinical.ts) supaya
 * form dan menu Analisis tidak bisa lagi berbeda pendapat. Ubah kebijakan
 * cukup di clinical.ts, form ikut otomatis.
 *
 * Dasar: Permenkes 2/2020 (antropometri anak), Permendagri 13/2024 (Posyandu
 * siklus hidup), Posyandu ILP 5 Langkah, dan ambang klinis di clinical.ts.
 */

import type { PatientCategory } from './types';
import { INDICATORS, type IndicatorKey } from './clinical';

export type MeasurementFieldKey =
  | 'weight'
  | 'height'
  | 'position'
  | 'headCircumference'
  | 'armCircumference'
  | 'waistCircumference'
  | 'systolic'
  | 'diastolic'
  | 'gestationalAge'
  | 'bloodSugar'
  | 'cholesterol'
  | 'uricAcid'
  | 'hemoglobin'
  | 'visionStatus'
  | 'hearingStatus'
  | 'tbScreeningStatus'
  | 'exclusiveBreastfeeding';

const ALL: PatientCategory[] = ['BAYI', 'BALITA_APRAS', 'REMAJA', 'DEWASA', 'LANSIA', 'BUMIL'];

function appliesToFromIndicator(key: IndicatorKey): PatientCategory[] {
  const ind = INDICATORS.find((i) => i.key === key);
  return ind ? ind.appliesTo : [];
}

export const FIELD_APPLIES_TO: Record<MeasurementFieldKey, PatientCategory[]> = {
  // Antropometri & konteks (non-klinis).
  weight: ALL,
  height: ALL,
  position: ['BAYI', 'BALITA_APRAS'],
  headCircumference: ['BAYI', 'BALITA_APRAS'],
  // LiLA: balita (wasting), remaja/dewasa/lansia (status gizi), bumil (KEK <23,5 cm).
  armCircumference: ['BALITA_APRAS', 'REMAJA', 'DEWASA', 'LANSIA', 'BUMIL'],
  // Lingkar perut: obesitas sentral, skrining PTM dewasa & lansia.
  waistCircumference: ['DEWASA', 'LANSIA'],
  gestationalAge: ['BUMIL'],
  exclusiveBreastfeeding: ['BAYI'],
  // Klinis — diturunkan dari INDICATORS.appliesTo (clinical.ts).
  systolic: appliesToFromIndicator('hypertension'),
  diastolic: appliesToFromIndicator('hypertension'),
  bloodSugar: appliesToFromIndicator('highBloodSugar'),
  cholesterol: appliesToFromIndicator('highCholesterol'),
  uricAcid: appliesToFromIndicator('highUricAcid'),
  hemoglobin: appliesToFromIndicator('anemia'),
  visionStatus: appliesToFromIndicator('abnormalVision'),
  hearingStatus: appliesToFromIndicator('abnormalHearing'),
  tbScreeningStatus: appliesToFromIndicator('tbRisk'),
};

/** Apakah field ini perlu ditampilkan/diisi untuk kategori sasaran tsb. */
export function fieldAppliesTo(field: MeasurementFieldKey, category: PatientCategory): boolean {
  return FIELD_APPLIES_TO[field]?.includes(category) ?? false;
}
