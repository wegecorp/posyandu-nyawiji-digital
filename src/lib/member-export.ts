/**
 * Pembentuk baris untuk sheet "Daftar Anggota" & "Detail Pengukuran".
 * Murni (tanpa Prisma/React) agar bisa diuji terpisah.
 * Hanya dipakai untuk export level POSYANDU (data individu tidak keluar di atasnya).
 */

import { calculateAge, formatIndoDate, getPatientCategory } from './utils';
import {
  computeGrowth,
  findCategory,
  type GrowthIndex,
  type IndexResult,
  type StaturePosition,
} from './growth';
import type { PatientCategory } from './types';

export interface ExportPatient {
  id: string;
  regNumber: string;
  name: string;
  birthDate: Date | string;
  gender?: string | null;
  isPregnant: boolean;
}

export interface ExportMeasurement {
  patientId: string;
  sessionDate: Date | string;
  ageInMonths?: number | null;
  weight?: number | null;
  height?: number | null;
  headCircumference?: number | null;
  armCircumference?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  gestationalAge?: number | null;
  bloodSugar?: number | null;
  cholesterol?: number | null;
  uricAcid?: number | null;
  hemoglobin?: number | null;
  waistCircumference?: number | null;
  imt?: number | null;
  position?: string | null;
  zWeightAge?: number | null;
  zHeightAge?: number | null;
  zWeightHeight?: number | null;
  zBmiAge?: number | null;
  underweightStatus?: string | null;
  stuntingStatus?: string | null;
  wastingStatus?: string | null;
  weightStatus?: string | null;
  weightFaltering2T?: boolean;
  visionStatus?: string | null;
  hearingStatus?: string | null;
  noteSource?: string | null;
  category?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
}

export type ExportRow = Record<string, string | number>;

const GENDER_LABEL: Record<string, string> = { L: 'Laki-laki', P: 'Perempuan' };
const BLANK = '';

function toPosition(p: string | null | undefined): StaturePosition | undefined {
  return p === 'TELENTANG' || p === 'BERDIRI' ? p : undefined;
}

function statusLabel(
  index: GrowthIndex,
  storedKey: string | null | undefined,
  computed?: IndexResult,
): string {
  if (computed) return computed.label;
  return storedKey ? (findCategory(index, storedKey)?.label ?? storedKey) : BLANK;
}

function ntLabel(status: string | null | undefined): string {
  if (status === 'NAIK') return 'N';
  if (status === 'TIDAK_NAIK') return 'T';
  return BLANK;
}

/** Status gizi terhitung (hanya balita) sebagai fallback snapshot tersimpan. */
function growthFor(p: ExportPatient, m: ExportMeasurement) {
  const category =
    (m.category as PatientCategory) ??
    getPatientCategory(p.birthDate, p.isPregnant, p.gender, new Date(m.sessionDate));
  if (category !== 'BALITA') return undefined;
  return computeGrowth({
    gender: p.gender,
    birthDate: p.birthDate,
    sessionDate: m.sessionDate,
    weight: m.weight,
    height: m.height,
    position: toPosition(m.position),
  });
}

/**
 * Roster: 1 baris per anggota terdaftar, memakai pengukuran TERAKHIR dalam periode.
 * Anggota tanpa pengukuran tetap masuk (kolom kondisi kosong).
 */
export function buildRoster(
  patients: ExportPatient[],
  measurements: ExportMeasurement[],
  periodEnd: Date,
): ExportRow[] {
  const latest = new Map<string, ExportMeasurement>();
  for (const m of measurements) {
    const cur = latest.get(m.patientId);
    if (!cur || new Date(m.sessionDate).getTime() > new Date(cur.sessionDate).getTime()) {
      latest.set(m.patientId, m);
    }
  }

  return [...patients]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => {
      const m = latest.get(p.id);
      const age = calculateAge(p.birthDate, m ? new Date(m.sessionDate) : periodEnd);
      const g = m ? growthFor(p, m) : undefined;
      const tension =
        m?.systolic != null && m?.diastolic != null
          ? `${m.systolic}/${m.diastolic}`
          : m?.systolic != null
            ? `${m.systolic}/-`
            : BLANK;

      const row: ExportRow = {
        Nama: p.name,
        'Tgl Lahir': formatIndoDate(p.birthDate),
        Umur: age.display,
        'L/P': p.gender ? (GENDER_LABEL[p.gender] ?? p.gender) : BLANK,
        Bumil: p.isPregnant ? 'Ya' : 'Tidak',
        'Tgl Ukur Terakhir': m ? formatIndoDate(m.sessionDate) : BLANK,
        'BB (kg)': m?.weight ?? BLANK,
        'TB/PB (cm)': m?.height ?? BLANK,
        'LiLA (cm)': m?.armCircumference ?? BLANK,
        'LK (cm)': m?.headCircumference ?? BLANK,
        IMT: m?.imt ?? BLANK,
        'Status BB/U': statusLabel('BB_U', m?.underweightStatus, g?.BB_U),
        'Status TB/U': statusLabel('TB_U', m?.stuntingStatus, g?.TB_U),
        'Status BB/TB': statusLabel('BB_TB', m?.wastingStatus, g?.BB_TB),
        'Berat Naik/Tidak': ntLabel(m?.weightStatus),
        '2T (rujuk)': m?.weightFaltering2T ? 'Ya' : BLANK,
        'Tensi (mmHg)': tension,
        'Gula Darah (mg/dL)': m?.bloodSugar ?? BLANK,
        'Kolesterol (mg/dL)': m?.cholesterol ?? BLANK,
        'Asam Urat (mg/dL)': m?.uricAcid ?? BLANK,
        'HB (g/dL)': m?.hemoglobin ?? BLANK,
        Catatan: m?.notes ?? BLANK,
      };
      return row;
    });
}

/**
 * Detail: 1 baris per kunjungan dalam periode, diurut Nama lalu Tanggal.
 * Semua field pengukuran ikut (yang kosong dibiarkan kosong).
 */
export function buildDetails(
  patients: ExportPatient[],
  measurements: ExportMeasurement[],
): ExportRow[] {
  const byId = new Map(patients.map((p) => [p.id, p]));
  return measurements
    .filter((m) => byId.has(m.patientId))
    .sort((a, b) => {
      const an = byId.get(a.patientId)!.name.localeCompare(byId.get(b.patientId)!.name);
      if (an !== 0) return an;
      return new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime();
    })
    .map((m) => {
      const p = byId.get(m.patientId)!;
      const row: ExportRow = {
        Tanggal: formatIndoDate(m.sessionDate),
        NoReg: p.regNumber,
        Nama: p.name,
        'Umur (bln)': m.ageInMonths ?? BLANK,
        'BB (kg)': m.weight ?? BLANK,
        'TB/PB (cm)': m.height ?? BLANK,
        'LiLA (cm)': m.armCircumference ?? BLANK,
        'LK (cm)': m.headCircumference ?? BLANK,
        'Lingkar Perut (cm)': m.waistCircumference ?? BLANK,
        IMT: m.imt ?? BLANK,
        'Posisi Ukur': m.position ?? BLANK,
        Sistolik: m.systolic ?? BLANK,
        Diastolik: m.diastolic ?? BLANK,
        'Gula Darah': m.bloodSugar ?? BLANK,
        Kolesterol: m.cholesterol ?? BLANK,
        'Asam Urat': m.uricAcid ?? BLANK,
        HB: m.hemoglobin ?? BLANK,
        'Usia Kehamilan (mgg)': m.gestationalAge ?? BLANK,
        'Z BB/U': m.zWeightAge ?? BLANK,
        'Z TB/U': m.zHeightAge ?? BLANK,
        'Z BB/TB': m.zWeightHeight ?? BLANK,
        'Z IMT/U': m.zBmiAge ?? BLANK,
        'BB/U': statusLabel('BB_U', m.underweightStatus),
        'TB/U': statusLabel('TB_U', m.stuntingStatus),
        'BB/TB': statusLabel('BB_TB', m.wastingStatus),
        'Berat Naik/Tidak': ntLabel(m.weightStatus),
        '2T': m.weightFaltering2T ? 'Ya' : BLANK,
        'Skrining Mata': m.visionStatus ?? BLANK,
        'Skrining Telinga': m.hearingStatus ?? BLANK,
        'Sumber Catatan': m.noteSource ?? BLANK,
        'Dicatat Oleh': m.recordedBy ?? BLANK,
        Catatan: m.notes ?? BLANK,
      };
      return row;
    });
}
