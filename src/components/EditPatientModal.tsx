'use client';

import React, { useState, useEffect } from 'react';
import { PatientData } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { X, Edit3, Calendar, User, Home, Phone, Heart, Check, AlertTriangle, Lock } from 'lucide-react';
import { calculateAge, getPatientCategory, getCategoryBadge } from '@/lib/utils';

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
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [address, setAddress] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [phone, setPhone] = useState('');
  const [isPregnant, setIsPregnant] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (patient) {
      setName(patient.name || '');
      // Format birthDate to YYYY-MM-DD for date input
      if (patient.birthDate) {
        const formattedDate = new Date(patient.birthDate).toISOString().slice(0, 10);
        setBirthDate(formattedDate);
      } else {
        setBirthDate('');
      }
      setGender(patient.gender === 'P' ? 'P' : 'L');
      setAddress(patient.address || '');
      setGuardianName(patient.guardianName || '');
      setPhone(patient.phone || '');
      setIsPregnant(Boolean(patient.isPregnant));
      setErrorMsg('');
    }
  }, [patient]);

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
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan perubahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-[#dee3e9]">
        {/* Header */}
        <div className="bg-[#0f172a] text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-full">
              <Edit3 className="w-5 h-5 text-[#38bdf8]" />
            </div>
            <div>
              <h2 className="font-extrabold text-base leading-tight">Edit Data Pasien</h2>
              <p className="text-xs text-[#cbd5e1] mt-0.5">Perbarui / lengkapi informasi biodata pasien</p>
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

          {/* System Locked Reg Number Display */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">No. Registrasi Pasien</span>
              <span className="font-mono font-extrabold text-sm text-[#0f172a]">{patient.regNumber}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#64748b] bg-[#e2e8f0]/60 px-2.5 py-1 rounded-full border border-[#cbd5e1]/60">
              <Lock className="w-3 h-3 text-[#64748b]" />
              <span>Dikunci Sistem</span>
            </div>
          </div>

          {/* 1. Nama Pasien */}
          <div>
            <label className="block text-xs font-bold text-[#0f172a] mb-1.5">
              Nama Lengkap Pasien <span className="text-[#ef4444]">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Pasien"
                required
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#f0f7ff] border border-[#cbd5e1] rounded-2xl focus:bg-white focus:border-2 focus:border-[#0284c7] outline-none font-medium text-[#1e293b] transition-all"
              />
            </div>
          </div>

          {/* 2. Tanggal Lahir */}
          <div>
            <label className="block text-xs font-bold text-[#0f172a] mb-1.5">
              Tanggal Lahir (TTL) <span className="text-[#ef4444]">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-3.5" />
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                max={new Date().toISOString().slice(0, 10)}
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#f0f7ff] border border-[#cbd5e1] rounded-2xl focus:bg-white focus:border-2 focus:border-[#0284c7] outline-none font-medium text-[#1e293b] transition-all"
              />
            </div>

            {/* Live Age & Category Detection */}
            {agePreview && badge && (
              <div className="mt-2 p-3 bg-[#0284c7]/10 border border-[#0284c7]/20 rounded-2xl flex items-center justify-between text-xs animate-in fade-in duration-200">
                <div>
                  <span className="text-[#64748b]">Usia saat ini: </span>
                  <span className="font-extrabold text-[#0f172a]">{agePreview.display}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            )}
          </div>

          {/* 3. Jenis Kelamin */}
          <div>
            <label className="block text-xs font-bold text-[#0f172a] mb-1.5">Jenis Kelamin</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleGenderChange('L')}
                className={`py-2.5 px-4 rounded-full border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  gender === 'L'
                    ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-xs'
                    : 'bg-[#f0f7ff] text-[#0f172a] border-[#cbd5e1] hover:bg-[#e2e8f0]'
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
                    : 'bg-[#f0f7ff] text-[#0f172a] border-[#cbd5e1] hover:bg-[#e2e8f0]'
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
              ? 'bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed'
              : 'bg-rose-50/70 border-rose-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <Heart className={`w-4 h-4 ${gender === 'L' ? 'text-slate-400' : 'text-rose-500'}`} />
              <div>
                <span className={`text-xs font-bold ${gender === 'L' ? 'text-[#64748b]' : 'text-[#0f172a]'}`}>
                  Pasien Ibu Hamil (Bumil)
                </span>
                <p className="text-[11px] text-[#64748b]">
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


          {/* Additional Fields */}
          <div className="space-y-3 pt-2 border-t border-[#e2e8f0]">
            <div>
              <label className="block text-xs font-semibold text-[#64748b] mb-1">
                Nama Orang Tua / Wali
              </label>
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Nama Ibu / Ayah / Suami"
                className="w-full px-3.5 py-2 text-xs bg-[#f0f7ff] border border-[#cbd5e1] rounded-xl outline-none focus:bg-white focus:border-2 focus:border-[#0284c7]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748b] mb-1">
                Alamat / RT-RW
              </label>
              <div className="relative">
                <Home className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Contoh: RT 02 / RW 04 Purbosari"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#f0f7ff] border border-[#cbd5e1] rounded-xl outline-none focus:bg-white focus:border-2 focus:border-[#0284c7]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748b] mb-1">
                Nomor HP / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-2.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#f0f7ff] border border-[#cbd5e1] rounded-xl outline-none focus:bg-white focus:border-2 focus:border-[#0284c7]"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-[#f0f7ff] hover:bg-[#e2e8f0] text-[#0f172a] font-bold rounded-full text-xs transition-all touch-press border border-[#cbd5e1]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-3 px-6 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-full text-xs transition-all shadow-md flex items-center justify-center gap-2 touch-press disabled:opacity-50"
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
