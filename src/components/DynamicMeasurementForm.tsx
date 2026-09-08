'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  QrCode,
  FileText,
  User,
  History,
  ChevronRight,
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Autosave Hook
  const { saveStatus, lastSavedAt, triggerAutoSave } = useAutoSave(
    patient.id,
    user?.posyanduId || patient.posyanduId,
    user?.name
  );

  // Load today's existing measurement data when patient changes
  useEffect(() => {
    // Reset state first
    setWeight('');
    setHeight('');
    setHeadCircumference('');
    setArmCircumference('');
    setSystolic('');
    setDiastolic('');
    setGestationalAge('');
    setBloodSugar('');
    setCholesterol('');
    setUricAcid('');
    setHemoglobin('');
    setNotes('');

    // Fetch fresh patient data + today measurement + history
    const loadData = async () => {
      try {
        const res = await fetch(`/api/patients/${patient.id}`);
        const result = await res.json();
        if (result.success && result.data) {
          const p = result.data;
          if (p.todayMeasurement) {
            const tm = p.todayMeasurement;
            if (tm.weight !== null && tm.weight !== undefined) setWeight(String(tm.weight));
            if (tm.height !== null && tm.height !== undefined) setHeight(String(tm.height));
            if (tm.headCircumference !== null && tm.headCircumference !== undefined)
              setHeadCircumference(String(tm.headCircumference));
            if (tm.armCircumference !== null && tm.armCircumference !== undefined)
              setArmCircumference(String(tm.armCircumference));
            if (tm.systolic !== null && tm.systolic !== undefined) setSystolic(String(tm.systolic));
            if (tm.diastolic !== null && tm.diastolic !== undefined) setDiastolic(String(tm.diastolic));
            if (tm.gestationalAge !== null && tm.gestationalAge !== undefined)
              setGestationalAge(String(tm.gestationalAge));
            if (tm.bloodSugar !== null && tm.bloodSugar !== undefined) setBloodSugar(String(tm.bloodSugar));
            if (tm.cholesterol !== null && tm.cholesterol !== undefined) setCholesterol(String(tm.cholesterol));
            if (tm.uricAcid !== null && tm.uricAcid !== undefined) setUricAcid(String(tm.uricAcid));
            if (tm.hemoglobin !== null && tm.hemoglobin !== undefined) setHemoglobin(String(tm.hemoglobin));
            if (tm.notes) setNotes(tm.notes);
          }
          if (p.measurements) {
            setHistoryList(p.measurements);
          }
        }
      } catch (e) {
        console.error('Error loading patient details:', e);
      }
    };

    loadData();
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
    <div className="space-y-3.5 max-w-xl mx-auto pb-24">
      {/* Patient Profile Card (DESIGN.md card pattern) */}
      <div className="bg-white rounded-[24px] p-4.5 border border-[#dee3e9] shadow-xs relative overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3.5">
            {/* Avatar: Lucide User Icon */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-base shadow-xs shrink-0 border ${
                patient.gender === 'P'
                  ? 'bg-pink-50 text-pink-700 border-pink-200'
                  : 'bg-[#0064e0]/10 text-[#0064e0] border-[#0064e0]/20'
              }`}
            >
              <User className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-[#0a1317] leading-tight">
                  {patient.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                  {badge.label}
                </span>
              </div>

              <div className="text-xs text-[#5d6c7b] mt-1 flex items-center gap-2 flex-wrap font-medium">
                <span className="font-mono bg-[#f1f4f7] px-2 py-0.5 rounded-md text-[11px] text-[#0a1317] font-bold">
                  {patient.regNumber}
                </span>
                <span>• Usia: <strong className="text-[#0a1317]">{patient.ageDisplay}</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onShowQR(patient)}
            className="w-10 h-10 flex items-center justify-center text-[#0064e0] bg-[#f1f4f7] hover:bg-[#dee3e9] border border-[#ced0d4] rounded-full transition-all touch-press shrink-0"
            title="Lihat Kartu / QR Pasien"
          >
            <QrCode className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Additional info snippet */}
        {(patient.guardianName || patient.address) && (
          <div className="mt-3 pt-2.5 border-t border-[#dee3e9] flex items-center justify-between text-xs text-[#5d6c7b]">
            {patient.guardianName && (
              <span className="truncate">
                Wali: <strong className="text-[#0a1317]">{patient.guardianName}</strong>
              </span>
            )}
            {patient.address && (
              <span className="truncate text-[#5d6c7b]">{patient.address}</span>
            )}
          </div>
        )}
      </div>

      {/* Mode Tabs: Input Form vs History (Pill Tab Navigation per DESIGN.md) */}
      <div className="flex bg-[#f1f4f7] p-1.5 rounded-full border border-[#dee3e9]">
        <button
          onClick={() => setActiveTab('form')}
          className={`flex-1 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'form'
              ? 'bg-[#0a1317] text-white shadow-xs'
              : 'text-[#5d6c7b] hover:text-[#0a1317]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Input Pengukuran Hari Ini</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-[#0a1317] text-white shadow-xs'
              : 'text-[#5d6c7b] hover:text-[#0a1317]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat ({historyList.length})</span>
        </button>
      </div>

      {/* Auto-Save Live Status Banner */}
      {activeTab === 'form' && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-white border border-[#dee3e9] rounded-full text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#5d6c7b]" />
            <span className="text-[#5d6c7b] text-[11px]">
              Sesi Hari Ini: <strong className="text-[#0a1317]">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
            </span>
          </div>

          {/* Realtime Save Badge */}
          <div className="flex items-center gap-1">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#0a1317] bg-[#f7b928] px-2.5 py-0.5 rounded-full animate-save-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Menyimpan...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#31a24c] px-2.5 py-0.5 rounded-full animate-in fade-in duration-150">
                <CheckCircle2 className="w-3 h-3" /> Tersimpan Otomatis
              </span>
            )}
            {saveStatus === 'offline_queued' && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#0064e0] px-2.5 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" /> Tersimpan Offline
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className="text-[11px] text-[#8595a4]">
                Auto-save aktif
              </span>
            )}
          </div>
        </div>
      )}

      {/* 1. INPUT FORM VIEW */}
      {activeTab === 'form' && (
        <div className="space-y-3.5">
          {/* Card: Basic Measurements (BB & TB for All Categories) */}
          <div className="bg-white rounded-2xl p-5 border border-[#e9edef] shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-[#075e54] uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#075e54]" />
              <span>Pengukuran Fisik Utama</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Berat Badan (BB) */}
              <div className="bg-[#f0f2f5] p-3.5 rounded-2xl border-2 border-[#cbd5e1] focus-within:border-[#075e54] focus-within:bg-white transition-all">
                <label className="block text-sm font-black text-[#111b21] mb-1">
                  Berat Badan (BB)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.05"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => handleFieldChange('weight', e.target.value)}
                    placeholder="0.0"
                    className="w-full h-12 text-2xl font-black text-[#111b21] bg-transparent outline-none"
                  />
                  <span className="text-sm font-black text-[#075e54] bg-white px-3 py-1.5 rounded-xl border border-[#cbd5e1]">
                    kg
                  </span>
                </div>
              </div>

              {/* Tinggi / Panjang Badan (TB/PB) */}
              <div className="bg-[#f0f2f5] p-3.5 rounded-2xl border-2 border-[#cbd5e1] focus-within:border-[#075e54] focus-within:bg-white transition-all">
                <label className="block text-sm font-black text-[#111b21] mb-1">
                  {category === 'BALITA' ? 'Panjang / TB' : 'Tinggi Badan (TB)'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={height}
                    onChange={(e) => handleFieldChange('height', e.target.value)}
                    placeholder="0.0"
                    className="w-full h-12 text-2xl font-black text-[#111b21] bg-transparent outline-none"
                  />
                  <span className="text-sm font-black text-[#075e54] bg-white px-3 py-1.5 rounded-xl border border-[#cbd5e1]">
                    cm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Specific Age-Adaptive Measurements */}
          {/* A. BALITA (< 5 Tahun): Lingkar Kepala */}
          {category === 'BALITA' && (
            <div className="bg-white rounded-[24px] p-4.5 border border-[#31a24c]/30 shadow-xs space-y-3 animate-in fade-in duration-200">
              <h3 className="text-xs font-bold text-[#31a24c] uppercase tracking-wider flex items-center gap-2">
                <CircleDot className="w-4 h-4 text-[#31a24c]" />
                <span>Pengukuran Khusus Balita</span>
              </h3>

              <div className="bg-[#f1f4f7] p-3 rounded-2xl border border-[#ced0d4] focus-within:border-2 focus-within:border-[#1876f2] focus-within:bg-white transition-all">
                <label className="block text-xs font-bold text-[#0a1317] mb-1">
                  Lingkar Kepala (LK)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={headCircumference}
                    onChange={(e) => handleFieldChange('headCircumference', e.target.value)}
                    placeholder="0.0"
                    className="w-full text-xl font-extrabold text-[#0a1317] bg-transparent outline-none"
                  />
                  <span className="text-xs font-bold text-[#5d6c7b] bg-white px-2 py-1 rounded-md border border-[#ced0d4]">
                    cm
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* B. ANAK (5 - 9 Tahun): Lingkar Lengan Atas (LiLA) */}
          {category === 'ANAK' && (
            <div className="bg-white rounded-[24px] p-4.5 border border-[#0064e0]/30 shadow-xs space-y-3 animate-in fade-in duration-200">
              <h3 className="text-xs font-bold text-[#0064e0] uppercase tracking-wider flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#0064e0]" />
                <span>Pengukuran Khusus Anak (5-9 th)</span>
              </h3>

              <div className="bg-[#f1f4f7] p-3 rounded-2xl border border-[#ced0d4] focus-within:border-2 focus-within:border-[#1876f2] focus-within:bg-white transition-all">
                <label className="block text-xs font-bold text-[#0a1317] mb-1">
                  Lingkar Lengan Atas (LiLA)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={armCircumference}
                    onChange={(e) => handleFieldChange('armCircumference', e.target.value)}
                    placeholder="0.0"
                    className="w-full text-xl font-extrabold text-[#0a1317] bg-transparent outline-none"
                  />
                  <span className="text-xs font-bold text-[#5d6c7b] bg-white px-2 py-1 rounded-md border border-[#ced0d4]">
                    cm
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* C. REMAJA (10 - 17 Tahun): LiLA + Tensi */}
          {category === 'REMAJA' && (
            <div className="bg-white rounded-[24px] p-4.5 border border-[#0064e0]/30 shadow-xs space-y-3 animate-in fade-in duration-200">
              <h3 className="text-xs font-bold text-[#0064e0] uppercase tracking-wider flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#0064e0]" />
                <span>Pengukuran Remaja (LiLA & Tensi)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* LiLA */}
                <div className="bg-[#f1f4f7] p-3 rounded-2xl border border-[#ced0d4] focus-within:border-2 focus-within:border-[#1876f2] focus-within:bg-white transition-all">
                  <label className="block text-xs font-bold text-[#0a1317] mb-1">
                    Lingkar Lengan (LiLA)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={armCircumference}
                      onChange={(e) => handleFieldChange('armCircumference', e.target.value)}
                      placeholder="0.0"
                      className="w-full text-lg font-extrabold text-[#0a1317] bg-transparent outline-none"
                    />
                    <span className="text-xs font-bold text-[#5d6c7b] bg-white px-2 py-1 rounded-md border border-[#ced0d4]">
                      cm
                    </span>
                  </div>
                </div>

                {/* Tensi Darah */}
                <div className="bg-[#f1f4f7] p-3 rounded-2xl border border-[#ced0d4] focus-within:border-2 focus-within:border-[#1876f2] focus-within:bg-white transition-all">
                  <label className="block text-xs font-bold text-[#0a1317] mb-1">
                    Tekanan Darah (Tensi)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={systolic}
                      onChange={(e) => handleFieldChange('systolic', e.target.value)}
                      placeholder="Sistol (120)"
                      className="w-full text-base font-extrabold text-[#0a1317] bg-transparent outline-none"
                    />
                    <span className="text-[#8595a4] font-bold">/</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={diastolic}
                      onChange={(e) => handleFieldChange('diastolic', e.target.value)}
                      placeholder="Diastol (80)"
                      className="w-full text-base font-extrabold text-[#0a1317] bg-transparent outline-none"
                    />
                    <span className="text-[10px] font-bold text-[#5d6c7b]">mmHg</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* D. DEWASA / LANSIA (>= 18 Tahun): Tensi */}
          {category === 'DEWASA_LANSIA' && (
            <div className="bg-white rounded-[24px] p-4.5 border border-[#a121ce]/30 shadow-xs space-y-3 animate-in fade-in duration-200">
              <h3 className="text-xs font-bold text-[#a121ce] uppercase tracking-wider flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#a121ce]" />
                <span>Pengukuran Dewasa / Lansia (Tensi)</span>
              </h3>

              <div className="bg-[#f1f4f7] p-3 rounded-2xl border border-[#ced0d4] focus-within:border-2 focus-within:border-[#1876f2] focus-within:bg-white transition-all">
                <label className="block text-xs font-bold text-[#0a1317] mb-1">
                  Tekanan Darah (Tensi)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={systolic}
                      onChange={(e) => handleFieldChange('systolic', e.target.value)}
                      placeholder="Sistolik (120)"
                      className="w-full text-lg font-extrabold text-[#0a1317] bg-transparent outline-none"
                    />
                  </div>
                  <span className="text-[#8595a4] font-bold text-lg">/</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={diastolic}
                      onChange={(e) => handleFieldChange('diastolic', e.target.value)}
                      placeholder="Diastolik (80)"
                      className="w-full text-lg font-extrabold text-[#0a1317] bg-transparent outline-none"
                    />
                  </div>
                  <span className="text-xs font-bold text-[#5d6c7b] bg-white px-2 py-1 rounded-md border border-[#ced0d4]">
                    mmHg
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* E. IBU HAMIL (BUMIL): LiLA, Tensi, Usia Kehamilan */}
          {category === 'BUMIL' && (
            <div className="bg-white rounded-[24px] p-4.5 border border-pink-300 shadow-xs space-y-3 animate-in fade-in duration-200">
              <h3 className="text-xs font-bold text-pink-700 uppercase tracking-wider flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-pink-600" />
                <span>Pemeriksaan Khusus Ibu Hamil</span>
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* LiLA */}
                  <div className="bg-[#f1f4f7] p-3 rounded-2xl border border-[#ced0d4] focus-within:border-2 focus-within:border-[#1876f2] focus-within:bg-white transition-all">
                    <label className="block text-xs font-bold text-[#0a1317] mb-1">
                      LiLA (Lingkar Lengan)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        value={armCircumference}
                        onChange={(e) => handleFieldChange('armCircumference', e.target.value)}
                        placeholder="0.0"
                        className="w-full text-base font-extrabold text-[#0a1317] bg-transparent outline-none"
                      />
                      <span className="text-xs font-bold text-[#5d6c7b]">cm</span>
                    </div>
                  </div>

                  {/* Usia Kehamilan */}
                  <div className="bg-[#f1f4f7] p-3 rounded-2xl border border-[#ced0d4] focus-within:border-2 focus-within:border-[#1876f2] focus-within:bg-white transition-all">
                    <label className="block text-xs font-bold text-[#0a1317] mb-1">
                      Usia Kehamilan
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={gestationalAge}
                        onChange={(e) => handleFieldChange('gestationalAge', e.target.value)}
                        placeholder="0"
                        className="w-full text-base font-extrabold text-[#0a1317] bg-transparent outline-none"
                      />
                      <span className="text-xs font-bold text-[#5d6c7b]">Minggu</span>
                    </div>
                  </div>
                </div>

                {/* Tensi Bumil */}
                <div className="bg-[#f1f4f7] p-3 rounded-2xl border border-[#ced0d4] focus-within:border-2 focus-within:border-[#1876f2] focus-within:bg-white transition-all">
                  <label className="block text-xs font-bold text-[#0a1317] mb-1">
                    Tekanan Darah (Tensi)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={systolic}
                      onChange={(e) => handleFieldChange('systolic', e.target.value)}
                      placeholder="Sistolik (120)"
                      className="w-full text-base font-extrabold text-[#0a1317] bg-transparent outline-none"
                    />
                    <span className="text-[#8595a4] font-bold">/</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={diastolic}
                      onChange={(e) => handleFieldChange('diastolic', e.target.value)}
                      placeholder="Diastolik (80)"
                      className="w-full text-base font-extrabold text-[#0a1317] bg-transparent outline-none"
                    />
                    <span className="text-xs font-bold text-[#5d6c7b]">mmHg</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* F. LABORATORIUM SEDERHANA (Gula Darah, Kolesterol, Asam Urat, HB) */}
          <div className="bg-white rounded-[24px] p-4.5 border border-red-200 shadow-xs space-y-3 animate-in fade-in duration-200">
            <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
              <TestTube className="w-4 h-4 text-red-500" />
              <span>Pemeriksaan Laboratorium Sederhana</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Gula Darah */}
              <div className="bg-[#f1f4f7] p-3 rounded-2xl border border-[#ced0d4] focus-within:border-2 focus-within:border-[#1876f2] focus-within:bg-white transition-all">
                <label className="block text-xs font-bold text-[#0a1317] mb-1">
                  Gula Darah (GDS)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="1"
                    inputMode="numeric"
                    value={bloodSugar}
                    onChange={(e) => handleFieldChange('bloodSugar', e.target.value)}
                    placeholder="0"
                    className="w-full text-base font-extrabold text-[#0a1317] bg-transparent outline-none"
                  />
                  <span className="text-[10px] font-bold text-[#5d6c7b]">mg/dL</span>
                </div>
              </div>

              {/* Kolesterol */}
              <div className="bg-[#f1f4f7] p-3 rounded-2xl border border-[#ced0d4] focus-within:border-2 focus-within:border-[#1876f2] focus-within:bg-white transition-all">
                <label className="block text-xs font-bold text-[#0a1317] mb-1">
                  Kolesterol Total
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="1"
                    inputMode="numeric"
                    value={cholesterol}
                    onChange={(e) => handleFieldChange('cholesterol', e.target.value)}
                    placeholder="0"
                    className="w-full text-base font-extrabold text-[#0a1317] bg-transparent outline-none"
                  />
                  <span className="text-[10px] font-bold text-[#5d6c7b]">mg/dL</span>
                </div>
              </div>

              {/* Asam Urat */}
              <div className="bg-[#f1f4f7] p-3 rounded-2xl border border-[#ced0d4] focus-within:border-2 focus-within:border-[#1876f2] focus-within:bg-white transition-all">
                <label className="block text-xs font-bold text-[#0a1317] mb-1">
                  Asam Urat
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={uricAcid}
                    onChange={(e) => handleFieldChange('uricAcid', e.target.value)}
                    placeholder="0.0"
                    className="w-full text-base font-extrabold text-[#0a1317] bg-transparent outline-none"
                  />
                  <span className="text-[10px] font-bold text-[#5d6c7b]">mg/dL</span>
                </div>
              </div>

              {/* Hemoglobin (HB) */}
              <div className="bg-[#f1f4f7] p-3 rounded-2xl border border-[#ced0d4] focus-within:border-2 focus-within:border-[#1876f2] focus-within:bg-white transition-all">
                <label className="block text-xs font-bold text-[#0a1317] mb-1">
                  Hemoglobin (HB)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={hemoglobin}
                    onChange={(e) => handleFieldChange('hemoglobin', e.target.value)}
                    placeholder="0.0"
                    className="w-full text-base font-extrabold text-[#0a1317] bg-transparent outline-none"
                  />
                  <span className="text-[10px] font-bold text-[#5d6c7b]">g/dL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="bg-white rounded-[24px] p-4.5 border border-[#dee3e9] shadow-xs space-y-2">
            <label className="block text-xs font-bold text-[#0a1317] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#5d6c7b]" />
              <span>Catatan Kader / Keluhan / Pemberian Vitamin</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Tulis catatan (misal: vitamin A merah diberikan, anak demam 2 hari, dll)..."
              className="w-full p-3 text-xs bg-[#f1f4f7] border border-[#ced0d4] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#1876f2] transition-all font-medium text-[#1c1e21] resize-none"
            />
          </div>
        </div>
      )}

      {/* 2. HISTORY TAB VIEW */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {historyList.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-[24px] border border-[#dee3e9] text-[#5d6c7b] text-xs">
              Belum ada riwayat pengukuran sebelumnya untuk pasien ini.
            </div>
          ) : (
            historyList.map((hist, idx) => (
              <div
                key={hist.id || idx}
                className="bg-white rounded-[20px] p-4 border border-[#dee3e9] shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs border-b border-[#dee3e9] pb-2">
                  <div className="font-bold text-[#0a1317] flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#0064e0]" />
                    <span>{formatIndoDate(hist.sessionDate)}</span>
                  </div>
                  <span className="text-[11px] text-[#5d6c7b]">
                    Kader: {hist.recordedBy || '-'}
                  </span>
                </div>

                {/* Metrics chips */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {hist.weight && (
                    <span className="bg-[#f1f4f7] px-2.5 py-1 rounded-full text-[#0a1317] font-medium border border-[#dee3e9]">
                      BB: <strong>{hist.weight} kg</strong>
                    </span>
                  )}
                  {hist.height && (
                    <span className="bg-[#f1f4f7] px-2.5 py-1 rounded-full text-[#0a1317] font-medium border border-[#dee3e9]">
                      TB: <strong>{hist.height} cm</strong>
                    </span>
                  )}
                  {hist.headCircumference && (
                    <span className="bg-[#31a24c]/10 text-[#31a24c] px-2.5 py-1 rounded-full border border-[#31a24c]/20 font-medium">
                      LK: <strong>{hist.headCircumference} cm</strong>
                    </span>
                  )}
                  {hist.armCircumference && (
                    <span className="bg-[#0064e0]/10 text-[#0064e0] px-2.5 py-1 rounded-full border border-[#0064e0]/20 font-medium">
                      LiLA: <strong>{hist.armCircumference} cm</strong>
                    </span>
                  )}
                  {hist.systolic && (
                    <span className="bg-[#a121ce]/10 text-[#a121ce] px-2.5 py-1 rounded-full border border-[#a121ce]/20 font-medium">
                      Tensi: <strong>{hist.systolic}/{hist.diastolic}</strong> mmHg
                    </span>
                  )}
                  {hist.bloodSugar && (
                    <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full border border-red-200 font-medium">
                      Gula Darah: <strong>{hist.bloodSugar} mg/dL</strong>
                    </span>
                  )}
                  {hist.cholesterol && (
                    <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200 font-medium">
                      Kolesterol: <strong>{hist.cholesterol} mg/dL</strong>
                    </span>
                  )}
                  {hist.uricAcid && (
                    <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200 font-medium">
                      Asam Urat: <strong>{hist.uricAcid} mg/dL</strong>
                    </span>
                  )}
                  {hist.hemoglobin && (
                    <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200 font-medium">
                      HB: <strong>{hist.hemoglobin} g/dL</strong>
                    </span>
                  )}
                </div>

                {hist.notes && (
                  <p className="text-[11px] text-[#5d6c7b] italic bg-[#f1f4f7] p-2.5 rounded-xl border border-[#dee3e9]">
                    &quot;{hist.notes}&quot;
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Floating Bottom Action Bar (Fixed for Mobile - Giant WhatsApp Green Button) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-[#e9edef] z-30 shadow-2xl">
        <div className="max-w-xl mx-auto">
          <button
            onClick={onBackToList}
            className="w-full h-14 bg-[#25d366] hover:bg-[#128c7e] text-white font-black rounded-2xl text-base shadow-lg flex items-center justify-center gap-2 transition-all touch-press active:scale-98"
          >
            <CheckCircle2 className="w-6 h-6 text-white" />
            <span>SIMPAN & KEMBALI KE DAFTAR PASIEN</span>
          </button>
        </div>
      </div>
    </div>
  );
};

