'use client';

import React, { useState, useEffect } from 'react';
import { PatientData, MeasurementData } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useAutoSave } from '@/lib/offline-sync';
import {
  Scale,
  Ruler,
  CircleDot,
  HeartPulse,
  Activity,
  Calendar,
  CheckCircle2,
  AlertCircle,
  QrCode,
  FileText,
  User,
  History,
  RefreshCw,
  TestTube,
} from 'lucide-react';
import { getCategoryBadge, formatIndoDate } from '@/lib/utils';

interface DynamicMeasurementFormProps {
  patient: PatientData;
  onBackToList: () => void;
  onShowQR: (patient: PatientData) => void;
  onMeasurementUpdated?: () => void;
}

export const DynamicMeasurementForm: React.FC<DynamicMeasurementFormProps> = ({
  patient,
  onBackToList,
  onShowQR,
  onMeasurementUpdated,
}) => {
  const { user } = useAuth();
  const category = patient.category || 'BALITA';
  const badge = getCategoryBadge(category);

  // Form Fields State
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [headCircumference, setHeadCircumference] = useState<string>('');
  const [armCircumference, setArmCircumference] = useState<string>('');
  const [systolic, setSystolic] = useState<string>('');
  const [diastolic, setDiastolic] = useState<string>('');
  const [gestationalAge, setGestationalAge] = useState<string>('');
  const [bloodSugar, setBloodSugar] = useState<string>('');
  const [cholesterol, setCholesterol] = useState<string>('');
  const [uricAcid, setUricAcid] = useState<string>('');
  const [hemoglobin, setHemoglobin] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [historyList, setHistoryList] = useState<MeasurementData[]>([]);

  // Autosave Hook
  const { saveStatus, triggerAutoSave } = useAutoSave(
    patient.id,
    user?.posyanduId || patient.posyanduId,
    user?.name
  );

  // Muat data pengukuran hari ini & riwayat saat pasien aktif.
  // (Reset field tidak perlu manual: komponen di-remount tiap ganti pasien.)
  useEffect(() => {
    let active = true;
    fetch(`/api/patients/${patient.id}`)
      .then((res) => res.json())
      .then((result) => {
        if (!active || !result.success || !result.data) return;
        const p = result.data;
        const tm = p.todayMeasurement;
        if (tm) {
          if (tm.weight != null) setWeight(String(tm.weight));
          if (tm.height != null) setHeight(String(tm.height));
          if (tm.headCircumference != null) setHeadCircumference(String(tm.headCircumference));
          if (tm.armCircumference != null) setArmCircumference(String(tm.armCircumference));
          if (tm.systolic != null) setSystolic(String(tm.systolic));
          if (tm.diastolic != null) setDiastolic(String(tm.diastolic));
          if (tm.gestationalAge != null) setGestationalAge(String(tm.gestationalAge));
          if (tm.bloodSugar != null) setBloodSugar(String(tm.bloodSugar));
          if (tm.cholesterol != null) setCholesterol(String(tm.cholesterol));
          if (tm.uricAcid != null) setUricAcid(String(tm.uricAcid));
          if (tm.hemoglobin != null) setHemoglobin(String(tm.hemoglobin));
          if (tm.notes) setNotes(tm.notes);
        }
        if (p.measurements) {
          setHistoryList(p.measurements);
        }
      })
      .catch((e) => console.error('Error loading patient details:', e));
    return () => {
      active = false;
    };
  }, [patient.id]);

  const isReadOnly = user?.role === 'PUSKESMAS' || user?.role === 'DINKES';

  // Handle live field change with instant auto-save
  const handleFieldChange = (fieldName: string, value: string) => {
    if (isReadOnly) return;

    switch (fieldName) {
      case 'weight':
        setWeight(value);
        break;
      case 'height':
        setHeight(value);
        break;
      case 'headCircumference':
        setHeadCircumference(value);
        break;
      case 'armCircumference':
        setArmCircumference(value);
        break;
      case 'systolic':
        setSystolic(value);
        break;
      case 'diastolic':
        setDiastolic(value);
        break;
      case 'gestationalAge':
        setGestationalAge(value);
        break;
      case 'bloodSugar':
        setBloodSugar(value);
        break;
      case 'cholesterol':
        setCholesterol(value);
        break;
      case 'uricAcid':
        setUricAcid(value);
        break;
      case 'hemoglobin':
        setHemoglobin(value);
        break;
      case 'notes':
        setNotes(value);
        break;
    }

    // Trigger debounced autosave
    triggerAutoSave({ [fieldName]: value });
    if (onMeasurementUpdated) onMeasurementUpdated();
  };

  return (
    <div className="space-y-3.5 max-w-xl mx-auto pb-28">
      {/* Profile Card Pasien */}
      <div className="bg-white rounded-2xl p-4 border border-[#e9edef] shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-base shrink-0 border ${
                patient.gender === 'P'
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-sky-50 text-sky-600 border-sky-200'
              }`}
            >
              <User className="w-6 h-6" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-[#111b21] leading-tight truncate">
                  {patient.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.color}`}>
                  {badge.label}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#54656f] mt-1 font-medium flex-wrap">
                <span className="font-mono bg-[#f0f2f5] px-2 py-0.5 rounded-md text-[11px] text-[#111b21] font-bold border border-[#e9edef]">
                  {patient.regNumber}
                </span>
                <span>
                  Usia: <strong className="text-[#111b21]">{patient.ageDisplay}</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onShowQR(patient)}
            className="w-10 h-10 flex items-center justify-center text-[#075e54] bg-[#f0f2f5] hover:bg-[#e7fceb] border border-[#e9edef] rounded-full transition-all touch-press shrink-0"
            title="Lihat Kartu / QR Pasien"
          >
            <QrCode className="w-5 h-5" />
          </button>
        </div>

        {(patient.guardianName || patient.address) && (
          <div className="mt-3 pt-3 border-t border-[#f0f2f5] flex items-center justify-between gap-3 text-xs text-[#54656f] flex-wrap">
            {patient.guardianName && (
              <span className="truncate">
                Wali: <strong className="text-[#111b21]">{patient.guardianName}</strong>
              </span>
            )}
            {patient.address && <span className="truncate text-[#667781]">{patient.address}</span>}
          </div>
        )}
      </div>

      {/* Tabs: Input vs Riwayat */}
      <div className="flex bg-white p-1 rounded-xl border border-[#e9edef] text-xs font-semibold text-[#54656f] shadow-xs">
        <button
          onClick={() => setActiveTab('form')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'form' ? 'bg-[#075e54] text-white shadow-xs' : 'hover:text-[#111b21]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Input Hari Ini</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history' ? 'bg-[#075e54] text-white shadow-xs' : 'hover:text-[#111b21]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat ({historyList.length})</span>
        </button>
      </div>

      {/* Status Simpan */}
      {activeTab === 'form' && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-[#e9edef] rounded-2xl text-xs shadow-xs">
          <div className="flex items-center gap-2 text-[#54656f] min-w-0">
            <Calendar className="w-3.5 h-3.5 text-[#128c7e] shrink-0" />
            <span className="text-[11px] truncate">
              Sesi: <strong className="text-[#075e54]">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
            </span>
          </div>

          <div className="flex items-center shrink-0">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#b45309] bg-[#fef3c7] border border-[#fde68a] px-2.5 py-0.5 rounded-full animate-save-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Menyimpan...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#075e54] px-2.5 py-0.5 rounded-full animate-in fade-in duration-150">
                <CheckCircle2 className="w-3 h-3" /> Tersimpan Otomatis
              </span>
            )}
            {saveStatus === 'offline_queued' && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#0ea5e9] px-2.5 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" /> Tersimpan Offline
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className="text-[11px] text-[#8696a0] font-medium">Auto-save aktif</span>
            )}
          </div>
        </div>
      )}

      {/* 1. INPUT FORM */}
      {activeTab === 'form' && (
        <div className="space-y-3.5">
          {/* A. Ukur Fisik Utama (BB & TB) — semua kategori */}
          <SectionCard>
            <SectionHeader
              icon={Scale}
              title="Ukur Fisik Utama"
              hint="Wajib diisi untuk semua pasien"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MetricField
                label="Berat Badan (BB)"
                unit="kg"
                value={weight}
                onChange={(v) => handleFieldChange('weight', v)}
                step="0.05"
              />
              <MetricField
                label={category === 'BALITA' ? 'Panjang / TB' : 'Tinggi Badan (TB)'}
                unit="cm"
                value={height}
                onChange={(v) => handleFieldChange('height', v)}
                step="0.1"
              />
            </div>
          </SectionCard>

          {/* B. Ukur Khusus Balita */}
          {category === 'BALITA' && (
            <SectionCard>
              <SectionHeader
                icon={CircleDot}
                title="Ukur Khusus Balita"
                hint="Lingkar kepala (LK) memantau pertumbuhan otak"
              />
              <MetricField
                label="Lingkar Kepala (LK)"
                unit="cm"
                value={headCircumference}
                onChange={(v) => handleFieldChange('headCircumference', v)}
                step="0.1"
              />
            </SectionCard>
          )}

          {/* C. Ukur Khusus Anak (5-9 th) */}
          {category === 'ANAK' && (
            <SectionCard>
              <SectionHeader
                icon={Ruler}
                title="Ukur Khusus Anak (5–9 th)"
                hint="Lingkar lengan atas (LiLA) deteksi gizi kurang"
              />
              <MetricField
                label="Lingkar Lengan Atas (LiLA)"
                unit="cm"
                value={armCircumference}
                onChange={(v) => handleFieldChange('armCircumference', v)}
                step="0.1"
              />
            </SectionCard>
          )}

          {/* D. Ukur Khusus Remaja (10-17 th) */}
          {category === 'REMAJA' && (
            <SectionCard>
              <SectionHeader
                icon={HeartPulse}
                title="Ukur Khusus Remaja"
                hint="LiLA + tekanan darah"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricField
                  label="Lingkar Lengan Atas (LiLA)"
                  unit="cm"
                  value={armCircumference}
                  onChange={(v) => handleFieldChange('armCircumference', v)}
                  step="0.1"
                />
                <BloodPressureField
                  systolic={systolic}
                  diastolic={diastolic}
                  onSystolic={(v) => handleFieldChange('systolic', v)}
                  onDiastolic={(v) => handleFieldChange('diastolic', v)}
                />
              </div>
            </SectionCard>
          )}

          {/* E. Ukur Khusus Dewasa / Lansia */}
          {category === 'DEWASA_LANSIA' && (
            <SectionCard>
              <SectionHeader
                icon={HeartPulse}
                title="Ukur Khusus Dewasa / Lansia"
                hint="Tekanan darah"
              />
              <BloodPressureField
                systolic={systolic}
                diastolic={diastolic}
                onSystolic={(v) => handleFieldChange('systolic', v)}
                onDiastolic={(v) => handleFieldChange('diastolic', v)}
              />
            </SectionCard>
          )}

          {/* F. Pemeriksaan Ibu Hamil */}
          {category === 'BUMIL' && (
            <SectionCard>
              <SectionHeader
                icon={HeartPulse}
                title="Pemeriksaan Ibu Hamil"
                hint="LiLA, usia kehamilan & tekanan darah"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricField
                  label="Lingkar Lengan Atas (LiLA)"
                  unit="cm"
                  value={armCircumference}
                  onChange={(v) => handleFieldChange('armCircumference', v)}
                  step="0.1"
                />
                <MetricField
                  label="Usia Kehamilan"
                  unit="minggu"
                  value={gestationalAge}
                  onChange={(v) => handleFieldChange('gestationalAge', v)}
                  step="1"
                  inputMode="numeric"
                  placeholder="0"
                />
              </div>
              <BloodPressureField
                systolic={systolic}
                diastolic={diastolic}
                onSystolic={(v) => handleFieldChange('systolic', v)}
                onDiastolic={(v) => handleFieldChange('diastolic', v)}
              />
            </SectionCard>
          )}

          {/* G. Lab Sederhana */}
          <SectionCard>
            <SectionHeader
              icon={TestTube}
              title="Laboratorium Sederhana"
              hint="Opsional — isi hanya jika alat tersedia"
            />
            <div className="grid grid-cols-2 gap-3">
              <MetricField
                label="Gula Darah (GDS)"
                unit="mg/dL"
                value={bloodSugar}
                onChange={(v) => handleFieldChange('bloodSugar', v)}
                step="1"
                inputMode="numeric"
                placeholder="0"
                size="sm"
              />
              <MetricField
                label="Kolesterol Total"
                unit="mg/dL"
                value={cholesterol}
                onChange={(v) => handleFieldChange('cholesterol', v)}
                step="1"
                inputMode="numeric"
                placeholder="0"
                size="sm"
              />
              <MetricField
                label="Asam Urat"
                unit="mg/dL"
                value={uricAcid}
                onChange={(v) => handleFieldChange('uricAcid', v)}
                step="0.1"
                placeholder="0.0"
                size="sm"
              />
              <MetricField
                label="Hemoglobin (HB)"
                unit="g/dL"
                value={hemoglobin}
                onChange={(v) => handleFieldChange('hemoglobin', v)}
                step="0.1"
                placeholder="0.0"
                size="sm"
              />
            </div>
          </SectionCard>

          {/* H. Catatan */}
          <SectionCard>
            <SectionHeader
              icon={FileText}
              title="Catatan"
              hint="Keluhan, vitamin, atau tindak lanjut"
            />
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Contoh: vitamin A merah diberikan, anak demam 2 hari, rujuk ke puskesmas..."
              className="w-full p-3 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-[#128c7e] focus:ring-2 focus:ring-[#128c7e]/15 transition-all font-medium text-[#111b21] placeholder-[#8696a0] resize-none"
            />
          </SectionCard>
        </div>
      )}

      {/* 2. RIWAYAT */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {historyList.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#e9edef] text-[#54656f] text-xs font-medium">
              Belum ada riwayat pengukuran sebelumnya untuk pasien ini.
            </div>
          ) : (
            historyList.map((hist, idx) => (
              <div
                key={hist.id || idx}
                className="bg-white rounded-2xl p-4 border border-[#e9edef] shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs border-b border-[#f0f2f5] pb-2.5">
                  <div className="font-bold text-[#111b21] flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#128c7e]" />
                    <span>{formatIndoDate(hist.sessionDate)}</span>
                  </div>
                  <span className="text-[11px] text-[#667781]">
                    Kader: {hist.recordedBy || '-'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {hist.weight && (
                    <MetricChip label="BB" value={`${hist.weight} kg`} />
                  )}
                  {hist.height && (
                    <MetricChip label="TB" value={`${hist.height} cm`} />
                  )}
                  {hist.headCircumference && (
                    <MetricChip label="LK" value={`${hist.headCircumference} cm`} />
                  )}
                  {hist.armCircumference && (
                    <MetricChip label="LiLA" value={`${hist.armCircumference} cm`} />
                  )}
                  {hist.systolic && (
                    <MetricChip label="Tensi" value={`${hist.systolic}/${hist.diastolic} mmHg`} />
                  )}
                  {hist.bloodSugar && (
                    <MetricChip label="GDS" value={`${hist.bloodSugar} mg/dL`} />
                  )}
                  {hist.cholesterol && (
                    <MetricChip label="Kolesterol" value={`${hist.cholesterol} mg/dL`} />
                  )}
                  {hist.uricAcid && (
                    <MetricChip label="Asam Urat" value={`${hist.uricAcid} mg/dL`} />
                  )}
                  {hist.hemoglobin && (
                    <MetricChip label="HB" value={`${hist.hemoglobin} g/dL`} />
                  )}
                </div>

                {hist.notes && (
                  <p className="text-[11px] text-[#54656f] italic bg-[#f0f2f5] p-2.5 rounded-xl border border-[#e9edef]">
                    &quot;{hist.notes}&quot;
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-md border-t border-[#e9edef] z-30 shadow-2xl">
        <div className="max-w-xl mx-auto">
          <button
            onClick={onBackToList}
            className="w-full h-14 bg-[#25d366] hover:bg-[#128c7e] text-white font-black rounded-2xl text-base shadow-lg flex items-center justify-center gap-2 transition-all touch-press active:scale-[0.98]"
          >
            <CheckCircle2 className="w-6 h-6 text-white" />
            <span>{isReadOnly ? 'Tutup & Kembali ke Daftar' : 'Selesai — Kembali ke Daftar'}</span>
          </button>
          {!isReadOnly && (
            <p className="text-center text-[10px] text-[#667781] font-medium mt-1.5">
              Setiap angka tersimpan otomatis — tidak ada tombol simpan terpisah.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Sub Komponen Lokal ---------- */

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e9edef] shadow-xs p-4 space-y-3.5">
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-[#e7fceb] text-[#075e54] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-extrabold text-[#111b21] leading-tight">{title}</h3>
        {hint && <p className="text-[11px] text-[#667781] font-medium mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

const numInputCls =
  'w-full min-w-0 bg-transparent outline-none text-[#111b21] placeholder-[#8696a0] font-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

function MetricField({
  label,
  unit,
  value,
  onChange,
  placeholder = '0.0',
  step = '0.1',
  inputMode = 'decimal',
  size = 'lg',
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: string;
  inputMode?: 'decimal' | 'numeric';
  size?: 'lg' | 'sm';
}) {
  return (
    <div className="flex items-center gap-2 bg-[#f0f2f5] border border-[#e9edef] rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-[#128c7e] focus-within:ring-2 focus-within:ring-[#128c7e]/15 transition-all">
      <div className="min-w-0 flex-1">
        <label className="block text-[10px] font-bold text-[#667781] uppercase tracking-wide mb-0.5 truncate">
          {label}
        </label>
        <input
          type="number"
          step={step}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${numInputCls} ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}
        />
      </div>
      <span className="text-[10px] font-extrabold text-[#075e54] bg-white border border-[#e9edef] rounded-lg px-2 py-1 shrink-0">
        {unit}
      </span>
    </div>
  );
}

function BloodPressureField({
  systolic,
  diastolic,
  onSystolic,
  onDiastolic,
}: {
  systolic: string;
  diastolic: string;
  onSystolic: (value: string) => void;
  onDiastolic: (value: string) => void;
}) {
  return (
    <div className="bg-[#f0f2f5] border border-[#e9edef] rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:border-[#128c7e] focus-within:ring-2 focus-within:ring-[#128c7e]/15 transition-all">
      <label className="block text-[10px] font-bold text-[#667781] uppercase tracking-wide mb-1">
        Tekanan Darah (Tensi)
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          value={systolic}
          onChange={(e) => onSystolic(e.target.value)}
          placeholder="Sistolik"
          className={`${numInputCls} text-xl`}
        />
        <span className="text-xl font-bold text-[#8696a0] shrink-0">/</span>
        <input
          type="number"
          inputMode="numeric"
          value={diastolic}
          onChange={(e) => onDiastolic(e.target.value)}
          placeholder="Diastolik"
          className={`${numInputCls} text-xl`}
        />
        <span className="text-[10px] font-extrabold text-[#075e54] bg-white border border-[#e9edef] rounded-lg px-2 py-1 shrink-0">
          mmHg
        </span>
      </div>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="bg-[#f0f2f5] px-2.5 py-1 rounded-full text-[#54656f] font-medium border border-[#e9edef]">
      {label}: <strong className="font-extrabold text-[#111b21]">{value}</strong>
    </span>
  );
}
