'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { KeyRound, X, CheckCircle2, AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Semua kolom wajib diisi');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('Password baru minimal 8 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi password baru tidak cocok');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui password');
      }

      setSuccessMsg(data.message || 'Password berhasil diperbarui!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden border border-[#e2e8f0] flex flex-col">
        {/* Header */}
        <div className="bg-[#0f172a] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <KeyRound className="w-5 h-5 text-[#38bdf8]" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm leading-snug">Ubah Password Akun</h2>
              <p className="text-[11px] text-[#cbd5e1]">{user.name} ({user.role})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#ef4444] font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded-2xl text-xs text-[#10b981] font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10b981]" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#0f172a] mb-1.5">
              Password Saat Ini <span className="text-[#ef4444]">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPass ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan password lama Anda"
                className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0284c7] focus:border-transparent pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b]"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0f172a] mb-1.5">
              Password Baru <span className="text-[#ef4444]">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0284c7] focus:border-transparent pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b]"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0f172a] mb-1.5">
              Konfirmasi Password Baru <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru Anda"
              className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0284c7] focus:border-transparent"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#64748b] font-bold rounded-xl text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Simpan Password Baru</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
