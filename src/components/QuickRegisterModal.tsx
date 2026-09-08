'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PatientData } from '@/lib/types';
import { X, UserPlus, Calendar, User, Home, Phone, Heart, Check, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
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

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user.role,
        },
        body: JSON.stringify({
          name: name.trim(),
          birthDate,
          gender,
          address: address.trim() || undefined,
          guardianName: guardianName.trim() || undefined,
          phone: phone.trim() || undefined,
          isPregnant,
          posyanduId: user.posyanduId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mendaftar pasien');
      }

      // Reset form
      setName('');
      setBirthDate('');
      setAddress('');
      setGuardianName('');
      setPhone('');
      setIsPregnant(false);
      setShowOptional(false);

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
      <div className="bg-white w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-[#dee3e9]">
        {/* Header */}
        <div className="bg-[#075e54] text-white p-4.5 flex items-center justify-between">
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
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#ef4444] font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Posyandu Info Tag */}
          <div className="bg-[#f0f2f5] border border-[#e9edef] rounded-2xl p-3 text-xs text-[#54656f] flex items-center justify-between font-medium">
            <span>Posyandu:</span>
            <span className="font-extrabold text-[#075e54]">{user?.posyanduName || 'Posyandu Terpilih'}</span>
          </div>

          {/* 1. Nama Pasien (Wajib) */}
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
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl focus:bg-white focus:border-2 focus:border-[#128c7e] outline-none font-medium text-[#111b21] transition-all"
              />
            </div>
          </div>

          {/* 2. Tanggal Lahir (Wajib) */}
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
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl focus:bg-white focus:border-2 focus:border-[#128c7e] outline-none font-medium text-[#111b21] transition-all"
              />
            </div>

            {/* Live Age & Category Detection */}
            {agePreview && badge && (
              <div className="mt-2 p-3 bg-[#e7fceb] border border-[#25d366]/30 rounded-2xl flex items-center justify-between text-xs animate-in fade-in duration-200">
                <div>
                  <span className="text-[#54656f]">Usia saat ini: </span>
                  <span className="font-extrabold text-[#075e54]">{agePreview.display}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            )}
          </div>

          {/* 3. Jenis Kelamin */}
          <div>
            <label className="block text-xs font-bold text-[#111b21] mb-1.5">Jenis Kelamin</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleGenderChange('L')}
                className={`py-2.5 px-4 rounded-full border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  gender === 'L'
                    ? 'bg-[#128c7e] text-white border-[#128c7e] shadow-xs'
                    : 'bg-[#f0f2f5] text-[#111b21] border-[#e9edef] hover:bg-[#e9edef]'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Laki-laki</span>
              </button>
              <button
                type="button"
                onClick={() => handleGenderChange('P')}
                className={`py-2.5 px-4 rounded-full border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  gender === 'P'
                    ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                    : 'bg-[#f0f2f5] text-[#111b21] border-[#e9edef] hover:bg-[#e9edef]'
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
              <Heart className={`w-4 h-4 ${gender === 'L' ? 'text-slate-400' : 'text-rose-500'}`} />
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


          {/* Toggle Optional Fields */}
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="text-xs text-[#128c7e] font-bold hover:underline flex items-center gap-1.5 py-1"
          >
            {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{showOptional ? 'Sembunyikan' : 'Tambah'} Data Tambahan (Alamat, Wali, HP)</span>
          </button>

          {/* Optional Form Section */}
          {showOptional && (
            <div className="space-y-3 pt-2 border-t border-[#e9edef] animate-in slide-in-from-top-2 duration-150">
              <div>
                <label className="block text-xs font-semibold text-[#54656f] mb-1">
                  Nama Orang Tua / Wali (Opsional)
                </label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Nama Ibu / Ayah / Suami"
                  className="w-full px-3.5 py-2 text-xs bg-[#f0f2f5] border border-[#e9edef] rounded-xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] text-[#111b21]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#54656f] mb-1">
                  Alamat / RT-RW (Opsional)
                </label>
                <div className="relative">
                  <Home className="w-3.5 h-3.5 text-[#8696a0] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Contoh: RT 02 / RW 04 Purbosari"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-[#f0f2f5] border border-[#e9edef] rounded-xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] text-[#111b21]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#54656f] mb-1">
                  Nomor HP / WhatsApp (Opsional)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-[#8696a0] absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-[#f0f2f5] border border-[#e9edef] rounded-xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] text-[#111b21]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons (Pill Buttons per DESIGN.md) */}
          <div className="pt-3 flex gap-2.5">
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

