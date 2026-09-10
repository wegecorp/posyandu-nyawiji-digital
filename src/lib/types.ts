export type PatientCategory = 'BALITA' | 'ANAK' | 'REMAJA' | 'DEWASA_LANSIA' | 'BUMIL';

export interface PatientData {
  id: string;
  regNumber: string;
  name: string;
  birthDate: string; // ISO date
  gender?: string | null;
  address?: string | null;
  guardianName?: string | null;
  phone?: string | null;
  isPregnant: boolean;
  posyanduId: string;
  createdAt: string;
  category?: PatientCategory;
  ageYears?: number;
  ageMonths?: number;
  ageDisplay?: string;
  todayMeasurement?: MeasurementData | null;
  measurementComplete?: boolean;
  /** Pengukuran terbaru pasien menandai 2T (2x tidak naik) → perlu rujuk. */
  faltering2T?: boolean;
  latestMeasurement?: MeasurementData | null;
  measurements?: MeasurementData[];
}

export interface MeasurementData {
  id?: string;
  patientId: string;
  posyanduId: string;
  sessionDate: string;
  ageInMonths: number;
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
  ageInDays?: number | null;
  zWeightAge?: number | null;
  zHeightAge?: number | null;
  zWeightHeight?: number | null;
  zBmiAge?: number | null;
  underweightStatus?: string | null;
  stuntingStatus?: string | null;
  wastingStatus?: string | null;
  growthRefVersion?: string | null;
  weightGain?: number | null;
  weightStatus?: string | null;
  weightFaltering2T?: boolean;
  visionStatus?: string | null;
  hearingStatus?: string | null;
  noteSource?: string | null;
  category?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
  version?: number;
  createdAt?: string;
}

export interface UserSession {
  id: string;
  username: string;
  name: string;
  role: 'DINKES' | 'PUSKESMAS' | 'POSYANDU';
  healthCenterId?: string | null;
  healthCenterName?: string | null;
  posyanduId?: string | null;
  posyanduName?: string | null;
  posyanduCode?: string | null;
  kalurahan?: string | null;
  padukuhan?: string | null;
  kapanewon?: string | null;
}
