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
  Eye,
  Ear,
} from 'lucide-react';
import { getCategoryBadge, formatIndoDate } from '@/lib/utils';
import { validateMeasurementValue, validateBloodPressure, computeImt } from '@/lib/validation';

interface DynamicMeasurementFormProps {
  patient: PatientData;
  onBackToList: () => void;
  onShowQR: (patient: PatientData) => void;
}

export const DynamicMeasurementForm: React.FC<DynamicMeasurementFormProps> = ({
  patient,
  onBackToList,
  onShowQR,
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
  const [waistCircumference, setWaistCircumference] = useState<string>('');
  const [visionStatus, setVisionStatus] = useState<string>('');
  const [hearingStatus, setHearingStatus] = useState<string>('');
  const [noteSource, setNoteSource] = useState<string>('Kader');
  const [notes, setNotes] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [historyList, setHistoryList] = useState<MeasurementData[]>([]);

  // Autosave Hook
  const { saveStatus, triggerAutoSave, flushNow } = useAutoSave(
    patient.id,
    user?.posyanduId || patient.posyanduId,
    user?.name
  );

  // Isi field sesuai measurement pada tanggal sesi terpilih (termasuk backdate).
  const applyMeasurement = (tm: MeasurementData | null | undefined) => {
    setWeight(tm?.weight != null ? String(tm.weight) : '');
    setHeight(tm?.height != null ? String(tm.height) : '');
    setHeadCircumference(tm?.headCircumference != null ? String(tm.headCircumference) : '');
    setArmCircumference(tm?.armCircumference != null ? String(tm.armCircumference) : '');
    setWaistCircumference(tm?.waistCircumference != null ? String(tm.waistCircumference) : '');
    setSystolic(tm?.systolic != null ? String(tm.systolic) : '');
    setDiastolic(tm?.diastolic != null ? String(tm.diastolic) : '');
    setGestationalAge(tm?.gestationalAge != null ? String(tm.gestationalAge) : '');
    setBloodSugar(tm?.bloodSugar != null ? String(tm.bloodSugar) : '');
    setCholesterol(tm?.cholesterol != null ? String(tm.cholesterol) : '');
    setUricAcid(tm?.uricAcid != null ? String(tm.uricAcid) : '');
    setHemoglobin(tm?.hemoglobin != null ? String(tm.hemoglobin) : '');
    setVisionStatus(tm?.visionStatus || '');
    setHearingStatus(tm?.hearingStatus || '');
    setNoteSource(tm?.noteSource || 'Kader');
    setNotes(tm?.notes || '');
    setErrors({});
  };

  // Muat data pengukuran hari ini & riwayat saat pasien aktif.
  // (Reset field tidak perlu manual: komponen di-remount tiap ganti pasien.)
  useEffect(() => {
    let active = true;
    fetch(`/api/patients/${patient.id}`)
      .then((res) => res.json())
      .then((result) => {
        if (!active || !result.success || !result.data) return;
        const p = result.data;
        if (p.measurements) {
          setHistoryList(p.measurements);
        }
        applyMeasurement(p.todayMeasurement);
      })
      .catch((e) => console.error('Error loading patient details:', e));
    return () => {
      active = false;
    };
  }, [patient.id]);

  // Re-fetch measurement when sessionDate changes (backdate support).
  useEffect(() => {
    if (isReadOnly) return;
    let active = true;
    fetch(`/api/patients/${patient.id}`)
      .then((res) => res.json())
      .then((result) => {
        if (!active || !result.success || !result.data) return;
        const p = result.data;
        if (p.measurements) setHistoryList(p.measurements);
        const target = new Date(sessionDate);
        const start = new Date(target);
        start.setHours(0, 0, 0, 0);
        const end = new Date(target);
        end.setHours(23, 59, 59, 999);
        const match = (p.measurements || []).find((m: MeasurementData) => {
          const d = new Date(m.sessionDate);
          return d >= start && d <= end;
        });
        applyMeasurement(match || null);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [sessionDate]);

  const isReadOnly = user?.role === 'PUSKESMAS' || user?.role === 'DINKES';

  // Handle live field change with instant auto-save
  const validateFieldChange = (fieldName: string, value: string): boolean => {
    const errs: Record<string, string> = {};
    if (fieldName === 'systolic' || fieldName === 'diastolic') {
      const sys = fieldName === 'systolic' ? value : systolic;
      const dia = fieldName === 'diastolic' ? value : diastolic;
      const bp = validateBloodPressure(sys, dia);
      if (!bp.valid && bp.message) {
        errs.systolic = bp.message;
        errs.diastolic = bp.message;
      } else {
        const s = validateMeasurementValue('systolic', sys);
        const d = validateMeasurementValue('diastolic', dia);
        if (!s.valid && s.message) errs.systolic = s.message;
        if (!d.valid && d.message) errs.diastolic = d.message;
      }
    } else {
      const r = validateMeasurementValue(fieldName, value);
      if (!r.valid && r.message) errs[fieldName] = r.message;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

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
      case 'waistCircumference':
        setWaistCircumference(value);
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
      case 'visionStatus':
        setVisionStatus(value);
        break;
      case 'hearingStatus':
        setHearingStatus(value);
        break;
      case 'noteSource':
        setNoteSource(value);
        break;
      case 'sessionDate':
        // Nilai tertunda pada tanggal lama harus terkirim lebih dulu, sebelum field
        // di-reset oleh data tanggal baru — kalau tidak, patch lama ikut ke tanggal baru.
        flushNow();
        setSessionDate(value);
        {
          const target = new Date(value);
          const start = new Date(target);
          start.setHours(0, 0, 0, 0);
          const end = new Date(target);
          end.setHours(23, 59, 59, 999);
          const match = historyList.find((m) => {
            const d = new Date(m.sessionDate);
            return d >= start && d <= end;
          });
          if (match) applyMeasurement(match);
        }
        return;
      case 'notes':
        setNotes(value);
        break;
    }

    if (!validateFieldChange(fieldName, value)) return;

    // Sertakan tanggal sesi supaya nilai tersimpan ke tanggal yang dipilih, bukan default hari ini.
    const payload: Record<string, string> = { [fieldName]: value };
    if (fieldName !== 'sessionDate') payload.sessionDate = sessionDate;

    // Trigger debounced autosave
    triggerAutoSave(payload);
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
            <label className="text-[11px] flex items-center gap-1.5 truncate">
              Sesi:
              <input
                type="date"
                value={sessionDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => handleFieldChange('sessionDate', e.target.value)}
                className="text-[11px] font-bold text-[#075e54] bg-[#f0f2f5] border border-[#e9edef] rounded-lg px-2 py-1 outline-none focus:border-[#128c7e]"
              />
            </label>
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
            {saveStatus === 'conflict' && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#ea580c] px-2.5 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" /> Data Bentrok — Muat Ulang
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#dc2626] px-2.5 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" /> Gagal Menyimpan
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
          {/* Peringatan kelengkapan wajib (BB & TB) */}
          {(weight === '' || height === '') && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-2xl px-3.5 py-2.5 text-xs text-[#b45309] font-bold">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-px" />
              <span>
                Data belum lengkap — Berat Badan & Tinggi Badan wajib diisi agar status pasien terhitung
                <strong> Selesai</strong>.
              </span>
            </div>
          )}

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
                error={errors.weight}
              />
              <MetricField
                label={category === 'BALITA' ? 'Panjang / TB' : 'Tinggi Badan (TB)'}
                unit="cm"
                value={height}
                onChange={(v) => handleFieldChange('height', v)}
                step="0.1"
                error={errors.height}
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] font-bold text-[#54656f]">Indeks Massa Tubuh (IMT)</span>
              <span className="text-[11px] font-extrabold text-[#075e54] bg-[#e7fceb] border border-[#25d366]/30 rounded-lg px-2.5 py-1">
                {computeImt(weight, height) != null ? `${computeImt(weight, height)} kg/m²` : '—'}
              </span>
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
                error={errors.headCircumference}
              />
            </SectionCard>
          )}

          {/* Ukur Tambahan — semua kategori (opsional) */}
          <SectionCard>
            <SectionHeader
              icon={Ruler}
              title="Ukur Tambahan"
              hint="Opsional — untuk semua kategori"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MetricField
                label="Lingkar Lengan Atas (LiLA)"
                unit="cm"
                value={armCircumference}
                onChange={(v) => handleFieldChange('armCircumference', v)}
                step="0.1"
                error={errors.armCircumference}
              />
              <MetricField
                label="Lingkar Perut"
                unit="cm"
                value={waistCircumference}
                onChange={(v) => handleFieldChange('waistCircumference', v)}
                step="0.1"
                error={errors.waistCircumference}
              />
            </div>
          </SectionCard>

          {/* D. Ukur Khusus Remaja (10-17 th) */}
          {category === 'REMAJA' && (
            <SectionCard>
              <SectionHeader
                icon={HeartPulse}
                title="Ukur Khusus Remaja"
                hint="Tekanan darah"
              />
              <BloodPressureField
                systolic={systolic}
                diastolic={diastolic}
                onSystolic={(v) => handleFieldChange('systolic', v)}
                onDiastolic={(v) => handleFieldChange('diastolic', v)}
                error={errors.systolic || errors.diastolic}
              />
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
                error={errors.systolic || errors.diastolic}
              />
            </SectionCard>
          )}

          {/* F. Pemeriksaan Ibu Hamil */}
          {category === 'BUMIL' && (
            <SectionCard>
              <SectionHeader
                icon={HeartPulse}
                title="Pemeriksaan Ibu Hamil"
                hint="Usia kehamilan & tekanan darah"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricField
                  label="Usia Kehamilan"
                  unit="minggu"
                  value={gestationalAge}
                  onChange={(v) => handleFieldChange('gestationalAge', v)}
                  step="1"
                  inputMode="numeric"
                  placeholder="0"
                  error={errors.gestationalAge}
                />
              </div>
              <BloodPressureField
                systolic={systolic}
                diastolic={diastolic}
                onSystolic={(v) => handleFieldChange('systolic', v)}
                onDiastolic={(v) => handleFieldChange('diastolic', v)}
                error={errors.systolic || errors.diastolic}
              />
            </SectionCard>
          )}

          {/* Skrining Indra — semua kategori (opsional) */}
          <SectionCard>
            <SectionHeader
              icon={Eye}
              title="Skrining Indra"
              hint="Hasil pemeriksaan mata & telinga"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ScreeningField
                icon={Eye}
                label="Skrining Mata"
                value={visionStatus}
                onChange={(v) => handleFieldChange('visionStatus', v)}
              />
              <ScreeningField
                icon={Ear}
                label="Skrining Telinga"
                value={hearingStatus}
                onChange={(v) => handleFieldChange('hearingStatus', v)}
              />
            </div>
          </SectionCard>

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
                error={errors.bloodSugar}
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
                error={errors.cholesterol}
              />
              <MetricField
                label="Asam Urat"
                unit="mg/dL"
                value={uricAcid}
                onChange={(v) => handleFieldChange('uricAcid', v)}
                step="0.1"
                placeholder="0.0"
                size="sm"
                error={errors.uricAcid}
              />
              <MetricField
                label="Hemoglobin (HB)"
                unit="g/dL"
                value={hemoglobin}
                onChange={(v) => handleFieldChange('hemoglobin', v)}
                step="0.1"
                placeholder="0.0"
                size="sm"
                error={errors.hemoglobin}
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
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#54656f]">
              <span>Ditulis oleh:</span>
              {(['Kader', 'Nakes'] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => handleFieldChange('noteSource', src)}
                  className={`px-3 py-1.5 rounded-full border transition-all ${
                    noteSource === src
                      ? 'bg-[#075e54] text-white border-[#075e54]'
                      : 'bg-white text-[#54656f] border-[#e9edef] hover:bg-[#f0f2f5]'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
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
                  {hist.waistCircumference && (
                    <MetricChip label="Lingkar Perut" value={`${hist.waistCircumference} cm`} />
                  )}
                  {hist.imt && (
                    <MetricChip label="IMT" value={`${hist.imt} kg/m²`} />
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
                  {hist.visionStatus && (
                    <MetricChip label="Mata" value={hist.visionStatus} />
                  )}
                  {hist.hearingStatus && (
                    <MetricChip label="Telinga" value={hist.hearingStatus} />
                  )}
                </div>

                {hist.notes && (
                  <p className="text-[11px] text-[#54656f] italic bg-[#f0f2f5] p-2.5 rounded-xl border border-[#e9edef]">
                    {hist.noteSource ? `(${hist.noteSource}) ` : ''}&quot;{hist.notes}&quot;
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
  error,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: string;
  inputMode?: 'decimal' | 'numeric';
  size?: 'lg' | 'sm';
  error?: string;
}) {
  return (
    <div>
      <div
        className={`flex items-center gap-2 bg-[#f0f2f5] border rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:ring-2 transition-all ${
          error
            ? 'border-[#ef4444] focus-within:border-[#ef4444] focus-within:ring-[#ef4444]/15'
            : 'border-[#e9edef] focus-within:border-[#128c7e] focus-within:ring-[#128c7e]/15'
        }`}
      >
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
      {error && (
        <p className="text-[11px] text-[#ef4444] font-bold mt-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function BloodPressureField({
  systolic,
  diastolic,
  onSystolic,
  onDiastolic,
  error,
}: {
  systolic: string;
  diastolic: string;
  onSystolic: (value: string) => void;
  onDiastolic: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <div
        className={`bg-[#f0f2f5] border rounded-2xl px-3.5 py-2.5 focus-within:bg-white focus-within:ring-2 transition-all ${
          error
            ? 'border-[#ef4444] focus-within:border-[#ef4444] focus-within:ring-[#ef4444]/15'
            : 'border-[#e9edef] focus-within:border-[#128c7e] focus-within:ring-[#128c7e]/15'
        }`}
      >
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
      {error && (
        <p className="text-[11px] text-[#ef4444] font-bold mt-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function ScreeningField({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="bg-[#f0f2f5] border border-[#e9edef] rounded-2xl px-3.5 py-2.5">
      <label className="flex items-center gap-1.5 text-[10px] font-bold text-[#667781] uppercase tracking-wide mb-1.5">
        <Icon className="w-3.5 h-3.5 text-[#128c7e]" />
        {label}
      </label>
      <div className="grid grid-cols-2 bg-white p-1 rounded-xl border border-[#e9edef] gap-1">
        {(['Normal', 'Tidak Normal'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`py-2 rounded-lg text-[11px] font-bold transition-all ${
              value === opt
                ? 'bg-[#075e54] text-white shadow-xs'
                : 'text-[#54656f] hover:bg-[#f0f2f5]'
            }`}
          >
            {opt}
          </button>
        ))}
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
