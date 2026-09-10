'use client';

import React, { useState } from 'react';
import { PatientData } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { X, Edit3, Calendar, User, Home, Phone, Heart, Check, AlertTriangle, Lock } from 'lucide-react';
import { calculateAge, getPatientCategory, getCategoryBadge, todayLocalISODate } from '@/lib/utils';

interface EditPatientModalProps {
  isOpen: boolean;
  patient: PatientData | null;
  onClose: () => void;
  onSuccess: (updatedPatient: PatientData) => void;
}

export const EditPatientModal: React.FC<EditPatientModalProps> = ({
  isOpen,
  patient,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  // Nilai awal diambil dari `patient` saat komponen di-mount (parent memakai key utk remount per pasien).
  const fmtDate = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : '');
  const [name, setName] = useState(patient?.name || '');
  const [birthDate, setBirthDate] = useState(fmtDate(patient?.birthDate));
  const [gender, setGender] = useState<'L' | 'P'>(patient?.gender === 'P' ? 'P' : 'L');
  const [address, setAddress] = useState(patient?.address || '');
  const [guardianName, setGuardianName] = useState(patient?.guardianName || '');
  const [phone, setPhone] = useState(patient?.phone || '');
  const [isPregnant, setIsPregnant] = useState(Boolean(patient?.isPregnant));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !patient) return null;

  // Real-time preview of age and category
  const agePreview = birthDate ? calculateAge(birthDate) : null;
  const categoryPreview = birthDate ? getPatientCategory(birthDate, gender === 'L' ? false : isPregnant, gender) : null;
  const badge = categoryPreview ? getCategoryBadge(categoryPreview) : null;

  const handleGenderChange = (selectedGender: 'L' | 'P') => {
    setGender(selectedGender);
    if (selectedGender === 'L') {
      setIsPregnant(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Nama pasien wajib diisi');
      return;
    }
    if (!birthDate) {
      setErrorMsg('Tanggal lahir wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || '',
        },
        body: JSON.stringify({
          name: name.trim(),
          birthDate,
          gender,
          address: address.trim() || undefined,
          guardianName: guardianName.trim() || undefined,
          phone: phone.trim() || undefined,
          isPregnant,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui data pasien');
      }

      onSuccess(data.data);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan perubahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-[#e9edef]">
        {/* Header */}
        <div className="bg-[#075e54] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-full">
              <Edit3 className="w-5 h-5 text-[#25d366]" />
            </div>
            <div>
              <h2 className="font-extrabold text-base leading-tight">Edit Data Pasien</h2>
              <p className="text-xs text-[#e9edef] mt-0.5">Perbarui / lengkapi informasi biodata pasien</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#ef4444] font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* System Locked Reg Number Display */}
          <div className="bg-[#f0f2f5] border border-[#e9edef] rounded-xl p-3.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-[#54656f] uppercase tracking-wider block">No. Registrasi Pasien</span>
              <span className="font-mono font-extrabold text-sm text-[#075e54]">{patient.regNumber}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#54656f] bg-white px-2.5 py-1 rounded-full border border-[#e9edef] shrink-0">
              <Lock className="w-3 h-3 text-[#54656f]" />
              <span>Dikunci Sistem</span>
            </div>
          </div>

          {/* 1. Identitas Wajib */}
          <GroupLabel text="1 · Identitas" />

          <div>
            <label className="block text-xs font-bold text-[#111b21] mb-1.5">
              Nama Lengkap Pasien <span className="text-[#ef4444]">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Pasien"
                required
                className={fieldClsWithIcon}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111b21] mb-1.5">
              Tanggal Lahir (TTL) <span className="text-[#ef4444]">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                max={todayLocalISODate()}
                className={fieldClsWithIcon}
              />
            </div>

            {/* Live Age & Category Detection */}
            {agePreview && badge && (
              <div className="mt-2 p-3 bg-[#e7fceb] border border-[#25d366]/30 rounded-2xl flex items-center justify-between gap-2 text-xs animate-in fade-in duration-200">
                <div>
                  <span className="text-[#54656f]">Usia saat ini: </span>
                  <span className="font-extrabold text-[#075e54]">{agePreview.display}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            )}
          </div>

          {/* 2. Jenis Kelamin & Status */}
          <GroupLabel text="2 · Jenis Kelamin & Status" />

          <div>
            <label className="block text-xs font-bold text-[#111b21] mb-1.5">Jenis Kelamin</label>
            <div className="grid grid-cols-2 bg-white p-1 rounded-2xl border border-[#e9edef] gap-1">
              <button
                type="button"
                onClick={() => handleGenderChange('L')}
                className={`py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  gender === 'L'
                    ? 'bg-[#075e54] text-white shadow-xs'
                    : 'text-[#111b21] hover:bg-[#f0f2f5]'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Laki-laki</span>
              </button>
              <button
                type="button"
                onClick={() => handleGenderChange('P')}
                className={`py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  gender === 'P'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-[#111b21] hover:bg-[#f0f2f5]'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Perempuan</span>
              </button>
            </div>
          </div>

          {/* Tag Ibu Hamil Toggle */}
          <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
            gender === 'L'
              ? 'bg-[#f0f2f5]/60 border-[#e9edef] opacity-60 cursor-not-allowed'
              : 'bg-rose-50/70 border-rose-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <Heart className={`w-4 h-4 ${gender === 'L' ? 'text-[#8696a0]' : 'text-rose-500'}`} />
              <div>
                <span className={`text-xs font-bold ${gender === 'L' ? 'text-[#54656f]' : 'text-[#111b21]'}`}>
                  Pasien Ibu Hamil (Bumil)
                </span>
                <p className="text-[11px] text-[#54656f]">
                  {gender === 'L' ? 'Hanya berlaku untuk pasien Perempuan' : 'Aktifkan jika pasien saat ini dalam kondisi hamil'}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={gender === 'P' && isPregnant}
              disabled={gender === 'L'}
              onChange={(e) => setIsPregnant(e.target.checked)}
              className="w-5 h-5 accent-rose-500 rounded cursor-pointer disabled:cursor-not-allowed"
            />
          </div>

          {/* 3. Data Tambahan (Opsional) */}
          <GroupLabel text="3 · Data Tambahan (Opsional)" />

          <div>
            <label className="block text-xs font-bold text-[#111b21] mb-1.5">
              Nama Orang Tua / Wali
            </label>
            <input
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Nama Ibu / Ayah / Suami"
              className={fieldClsPlain}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111b21] mb-1.5">Alamat / RT-RW</label>
            <div className="relative">
              <Home className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: RT 02 / RW 04 Purbosari"
                className={fieldClsWithIcon}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111b21] mb-1.5">Nomor HP / WhatsApp</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className={fieldClsWithIcon}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#111b21] font-bold rounded-full text-xs transition-all touch-press border border-[#e9edef]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-3 px-6 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-xs transition-all shadow-md flex items-center justify-center gap-2 touch-press disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const fieldClsWithIcon =
  'w-full pl-10 pr-3 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl focus:bg-white focus:border-2 focus:border-[#128c7e] outline-none font-medium text-[#111b21] placeholder-[#8696a0] transition-all';

const fieldClsPlain =
  'w-full px-3.5 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl focus:bg-white focus:border-2 focus:border-[#128c7e] outline-none font-medium text-[#111b21] placeholder-[#8696a0] transition-all';

function GroupLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-black uppercase tracking-wider text-[#075e54]">{text}</span>
      <div className="flex-1 h-px bg-[#e9edef]" />
    </div>
  );
}
