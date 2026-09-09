'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PatientData } from '@/lib/types';
import { addToSyncQueue, genClientId } from '@/lib/offline-sync';
import { X, UserPlus, Calendar, User, Home, Phone, Heart, Check, AlertTriangle, Info, ChevronUp, ChevronDown } from 'lucide-react';
import { calculateAge, getPatientCategory, getCategoryBadge } from '@/lib/utils';

interface QuickRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPatient: PatientData) => void;
}

export const QuickRegisterModal: React.FC<QuickRegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [address, setAddress] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [phone, setPhone] = useState('');
  const [isPregnant, setIsPregnant] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [duplicate, setDuplicate] = useState<{ regNumber: string; name: string } | null>(null);

  if (!isOpen) return null;

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
      setErrorMsg('Tanggal lahir wajib diisi untuk penentuan kategori form');
      return;
    }
    if (!user?.posyanduId) {
      setErrorMsg('Pilih Posyandu aktif terlebih dahulu');
      return;
    }
    await doSubmit(false);
  };

  const handleForceRegister = async () => {
    await doSubmit(true);
  };

  const resetForm = () => {
    setName('');
    setBirthDate('');
    setGender('L');
    setAddress('');
    setGuardianName('');
    setPhone('');
    setIsPregnant(false);
    setShowOptional(false);
    setDuplicate(null);
  };

  const doSubmit = async (force: boolean) => {
    if (!user || !user.posyanduId) {
      setErrorMsg('Pilih Posyandu aktif terlebih dahulu');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setInfoMsg('');
    setDuplicate(null);

    const clientId = genClientId();
    const payload = {
      name: name.trim(),
      birthDate,
      gender,
      address: address.trim() || undefined,
      guardianName: guardianName.trim() || undefined,
      phone: phone.trim() || undefined,
      isPregnant,
      posyanduId: user.posyanduId,
      force,
    };

    // Offline: simpan ke antrean lokal, kirim otomatis saat kembali online.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addToSyncQueue({
        kind: 'patient',
        id: genClientId(),
        clientId,
        payload: payload as unknown as Record<string, string | number | null | undefined>,
        timestamp: Date.now(),
      });
      setInfoMsg('Tersimpan offline — data akan dikirim otomatis saat koneksi kembali.');
      setErrorMsg('');
      setIsSubmitting(false);
      resetForm();
      return;
    }

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user.role,
        },
        body: JSON.stringify({ ...payload, clientId }),
      });

      const data = await res.json();

      if (res.status === 409 && data.duplicate) {
        setDuplicate(data.existing);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mendaftar pasien');
      }

      resetForm();

      onSuccess(data.data);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan');
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
              <UserPlus className="w-5 h-5 text-[#25d366]" />
            </div>
            <div>
              <h2 className="font-extrabold text-base leading-tight">Pendaftaran Cepat Pasien</h2>
              <p className="text-xs text-[#e9edef] mt-0.5">Cukup nama & tanggal lahir (tanpa NIK)</p>
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

          {infoMsg && (
            <div className="p-3 bg-sky-50 border border-sky-300 rounded-2xl text-xs text-sky-700 font-bold flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-sky-600" />
              <span>{infoMsg}</span>
            </div>
          )}

          {duplicate && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-3">
              <div className="flex items-start gap-2 text-[#b45309] font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Pasien mirip sudah terdaftar: <strong>{duplicate.name}</strong> (No. {duplicate.regNumber})
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDuplicate(null)}
                  className="flex-1 py-2 px-3 bg-white border border-amber-300 text-[#b45309] font-bold rounded-full text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleForceRegister}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full text-xs disabled:opacity-50"
                >
                  Tetap Daftar Baru
                </button>
              </div>
            </div>
          )}

          {/* Posyandu Info Tag */}
          <div className="bg-[#f0f2f5] border border-[#e9edef] rounded-xl p-3 text-xs text-[#54656f] flex items-center justify-between gap-2 font-medium">
            <span>Posyandu:</span>
            <span className="font-extrabold text-[#075e54] truncate">{user?.posyanduName || 'Posyandu Terpilih'}</span>
          </div>

          {/* 1. Identitas Wajib */}
          <GroupLabel text="1 · Identitas Wajib" />

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
                placeholder="Contoh: Muhammad Arka Pratama"
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
                max={new Date().toISOString().slice(0, 10)}
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
                  {gender === 'L' ? 'Hanya berlaku untuk pasien Perempuan' : 'Form akan mengaktifkan kolom kehamilan & LiLA'}
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
          <div className="pt-1 flex items-center justify-between gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#54656f]">3 · Data Tambahan</span>
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="text-xs text-[#128c7e] font-bold flex items-center gap-1.5 py-1 hover:underline"
            >
              {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>{showOptional ? 'Sembunyikan' : 'Isi (opsional)'}</span>
            </button>
          </div>

          {/* Optional Form Section */}
          {showOptional && (
            <div className="space-y-3.5 pt-2 border-t border-[#e9edef] animate-in slide-in-from-top-2 duration-150">
              <div>
                <label className="block text-xs font-bold text-[#111b21] mb-1.5">
                  Nama Orang Tua / Wali <span className="text-[#8696a0] font-medium">(opsional)</span>
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
                <label className="block text-xs font-bold text-[#111b21] mb-1.5">
                  Alamat / RT-RW <span className="text-[#8696a0] font-medium">(opsional)</span>
                </label>
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
                <label className="block text-xs font-bold text-[#111b21] mb-1.5">
                  Nomor HP / WhatsApp <span className="text-[#8696a0] font-medium">(opsional)</span>
                </label>
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
            </div>
          )}

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
                  <span>Daftar & Langsung Ukur</span>
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
