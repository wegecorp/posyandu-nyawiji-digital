'use client';

import React, { useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  User,
  ShieldCheck,
  X,
  LogOut,
  Building2,
  Building,
} from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  // Handle ESC key press to close modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !user) return null;

  const handleLogout = () => {
    logout();
    onClose();
  };

  const getRoleBadge = () => {
    switch (user.role) {
      case 'DINKES':
        return { label: 'Super Admin Dinkes', color: 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/30' };
      case 'PUSKESMAS':
        return { label: 'Admin Puskesmas', color: 'bg-[#0284c7]/10 text-[#0284c7] border-[#0284c7]/30' };
      case 'POSYANDU':
        return { label: 'Kader Posyandu', color: 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30' };
      default:
        return { label: 'Pengguna', color: 'bg-[#f0f7ff] text-[#0f172a] border-[#cbd5e1]' };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden border border-[#e2e8f0] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-[#0f172a] text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-5 h-5 text-[#38bdf8]" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm leading-tight">Detail Akun Sesi</h2>
              <p className="text-[11px] text-[#cbd5e1]">Posyandu Digital Gunungkidul</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account Details Body */}
        <div className="p-5 space-y-4">
          <div className="bg-[#f0f7ff] border border-[#e2e8f0] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-[#0f172a] text-sm truncate">{user.name}</h3>
                <p className="text-xs font-mono text-[#64748b] truncate">@{user.username}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-xs">
              <span className="text-[#64748b] font-medium">Peran / Akses:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
            </div>

            {user.posyanduName && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-[#64748b] font-medium flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#10b981]" /> Posyandu:
                </span>
                <span className="font-bold text-[#0f172a] truncate max-w-[170px]">{user.posyanduName}</span>
              </div>
            )}

            {user.healthCenterName && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-[#64748b] font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#0284c7]" /> Puskesmas:
                </span>
                <span className="font-bold text-[#0f172a] truncate max-w-[170px]">{user.healthCenterName}</span>
              </div>
            )}
          </div>

          {/* Logout Action Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold rounded-full text-xs transition-all shadow-sm flex items-center justify-center gap-2 touch-press"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
};



