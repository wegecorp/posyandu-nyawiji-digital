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
import { INDICATORS, checkIndicator, indicatorHasValue, type IndicatorDef } from './clinical';

export interface ExportPatient {
  id: string;
  regNumber: string;
  name: string;
  birthDate: Date | string;
  gender?: string | null;
  isPregnant: boolean;
  address?: string | null;
  /** Nama posyandu asal (diisi saat export multi-unit). */
  unitName?: string | null;
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
  tbScreeningStatus?: string | null;
  exclusiveBreastfeeding?: boolean | null;
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

/**
 * Ringkasan ASI eksklusif per pasien (dari seluruh pengukuran dalam periode).
 * - ada jawaban Tidak di bulan ke-m → "Berhenti bulan m"
 * - eksklusif tercatat sampai ≥ bulan 5 → "Eksklusif 6 bln"
 * - belum sampai 6 bln → "s/d bulan N"
 * - tak ada data → kosong
 */
function asiSummary(ms: ExportMeasurement[]): string {
  const withAsi = ms
    .filter((m) => m.exclusiveBreastfeeding != null)
    .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
  if (withAsi.length === 0) return BLANK;

  const stopped = withAsi.find((m) => m.exclusiveBreastfeeding === false);
  if (stopped) return stopped.ageInMonths != null ? `Berhenti bulan ${stopped.ageInMonths}` : 'Berhenti';

  const lastAge = withAsi[withAsi.length - 1].ageInMonths;
  if (lastAge != null && lastAge >= 5) return 'Eksklusif 6 bln';
  return lastAge != null ? `s/d bulan ${lastAge}` : 'ASI eksklusif';
}

/** Status gizi terhitung (hanya balita) sebagai fallback snapshot tersimpan. */
function growthFor(p: ExportPatient, m: ExportMeasurement) {
  const category =
    (m.category as PatientCategory) ??
    getPatientCategory(p.birthDate, p.isPregnant, p.gender, new Date(m.sessionDate));
  if (category !== 'BAYI' && category !== 'BALITA_APRAS') return undefined;
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
  const byPatient = new Map<string, ExportMeasurement[]>();
  for (const m of measurements) {
    const cur = latest.get(m.patientId);
    if (!cur || new Date(m.sessionDate).getTime() > new Date(cur.sessionDate).getTime()) {
      latest.set(m.patientId, m);
    }
    const list = byPatient.get(m.patientId) ?? [];
    list.push(m);
    byPatient.set(m.patientId, list);
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
        Posyandu: p.unitName ?? BLANK,
        Nama: p.name,
        'Tgl Lahir': formatIndoDate(p.birthDate),
        Umur: age.display,
        'L/P': p.gender ? (GENDER_LABEL[p.gender] ?? p.gender) : BLANK,
        Alamat: p.address ?? BLANK,
        Bumil: p.isPregnant ? 'Ya' : 'Tidak',
        'Tgl Ukur Terakhir': m ? formatIndoDate(m.sessionDate) : BLANK,
        'ASI Eksklusif': asiSummary(byPatient.get(p.id) ?? []),
        'Skrining TB': m?.tbScreeningStatus ?? BLANK,
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
        Posyandu: p.unitName ?? BLANK,
        Tanggal: formatIndoDate(m.sessionDate),
        NoReg: p.regNumber,
        Nama: p.name,
        Alamat: p.address ?? BLANK,
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
        'Skrining TB': m.tbScreeningStatus ?? BLANK,
        'Sumber Catatan': m.noteSource ?? BLANK,
        'Dicatat Oleh': m.recordedBy ?? BLANK,
        Catatan: m.notes ?? BLANK,
      };
      return row;
    });
}

/** Nilai pemicu risiko untuk ditampilkan di daftar berisiko. */
function riskValue(m: ExportMeasurement, ind: IndicatorDef): string {
  if (ind.key === 'hypertension') return `${m.systolic ?? '-'}/${m.diastolic ?? '-'} mmHg`;
  if (ind.key === 'abnormalVision') return m.visionStatus ?? '-';
  if (ind.key === 'abnormalHearing') return m.hearingStatus ?? '-';
  if (ind.key === 'tbRisk') return 'Beresiko';
  if (!ind.field) return '-';
  const v = (m as unknown as Record<string, unknown>)[ind.field];
  return v != null ? `${v} ${ind.unit}` : '-';
}

/**
 * Daftar Berisiko: 1 baris per (pasien × jenis risiko) dari pengukuran
 * TERAKHIR dalam periode. Jenis risiko = temuan indikator klinis (TB beresiko,
 * hipertensi, anemia, dll) + BB 2T. Menyertakan Posyandu & Alamat asal pasien.
 */
export function buildRiskList(patients: ExportPatient[], measurements: ExportMeasurement[]): ExportRow[] {
  const latest = new Map<string, ExportMeasurement>();
  for (const m of measurements) {
    const cur = latest.get(m.patientId);
    if (!cur || new Date(m.sessionDate).getTime() > new Date(cur.sessionDate).getTime()) {
      latest.set(m.patientId, m);
    }
  }

  const byId = new Map(patients.map((p) => [p.id, p]));
  const rows: ExportRow[] = [];

  for (const [pid, m] of latest) {
    const p = byId.get(pid);
    if (!p) continue;

    const session = new Date(m.sessionDate);
    const category =
      (m.category as PatientCategory) ??
      getPatientCategory(p.birthDate, p.isPregnant, p.gender, session);

    const base: ExportRow = {
      Posyandu: p.unitName ?? BLANK,
      Nama: p.name,
      NoReg: p.regNumber,
      Alamat: p.address ?? BLANK,
      Umur: calculateAge(p.birthDate, session).display,
      'L/P': p.gender ? (GENDER_LABEL[p.gender] ?? p.gender) : BLANK,
      'Tanggal Ukur': formatIndoDate(m.sessionDate),
      'Jenis Risiko': BLANK,
      Nilai: BLANK,
      Catatan: m.notes ?? BLANK,
    };

    for (const ind of INDICATORS) {
      if (!ind.appliesTo.includes(category)) continue;
      if (!indicatorHasValue(m, ind)) continue;
      if (!checkIndicator(m, ind, p.gender, category)) continue;
      rows.push({ ...base, 'Jenis Risiko': ind.label, Nilai: riskValue(m, ind) });
    }

    if (m.weightFaltering2T) {
      rows.push({
        ...base,
        'Jenis Risiko': 'BB 2T (tidak naik 2x)',
        Nilai: m.weight != null ? `${m.weight} kg` : '-',
      });
    }
  }

  return rows;
}
