'use client';

import React, { useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldCheck,
  X,
  LogOut,
  Building2,
  Building,
  KeyRound,
} from 'lucide-react';
import { useBackLayer } from '@/lib/back-navigation';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChangePassword?: () => void;
}

export const LoginModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onChangePassword }) => {
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

  useBackLayer(isOpen, onClose);

  if (!isOpen || !user) return null;

  const handleLogout = () => {
    logout();
    onClose();
  };

  const getRoleBadge = () => {
    switch (user.role) {
      case 'DINKES':
        return { label: 'Super Admin Dinkes', color: 'bg-[#e7fceb] text-[#075e54] border-[#25d366]/40' };
      case 'PUSKESMAS':
        return { label: 'Admin Puskesmas', color: 'bg-[#e7fceb] text-[#075e54] border-[#25d366]/40' };
      case 'POSYANDU':
        return { label: 'Kader Posyandu', color: 'bg-[#e7fceb] text-[#075e54] border-[#25d366]/40' };
      default:
        return { label: 'Pengguna', color: 'bg-[#f0f2f5] text-[#111b21] border-[#e9edef]' };
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
      <div className="bg-white w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden border border-[#e9edef] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-[#075e54] text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-5 h-5 text-[#25d366]" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm leading-tight">Detail Akun Sesi</h2>
              <p className="text-[11px] text-[#e9edef]">POSYANDU NYAWIJI DIGITAL</p>
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
          <div className="bg-[#f0f2f5] border border-[#e9edef] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#075e54] text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-[#111b21] text-sm truncate">{user.name}</h3>
                <p className="text-xs font-mono text-[#54656f] truncate">@{user.username}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#e9edef] flex items-center justify-between text-xs">
              <span className="text-[#54656f] font-medium">Peran / Akses:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
            </div>

            {user.posyanduName && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-[#54656f] font-medium flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#25d366]" /> Posyandu:
                </span>
                <span className="font-bold text-[#111b21] truncate max-w-[170px]">{user.posyanduName}</span>
              </div>
            )}

            {user.healthCenterName && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-[#54656f] font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#128c7e]" /> Puskesmas:
                </span>
                <span className="font-bold text-[#111b21] truncate max-w-[170px]">{user.healthCenterName}</span>
              </div>
            )}
          </div>

          {/* Account Actions */}
          <div className="space-y-2">
            {onChangePassword && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onChangePassword();
                }}
                className="w-full py-2.5 px-4 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#128c7e] font-extrabold rounded-full text-xs border border-[#e9edef] transition-all shadow-xs flex items-center justify-center gap-2 touch-press"
              >
                <KeyRound className="w-4 h-4" />
                <span>Ubah Password Saya</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 px-4 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold rounded-full text-xs transition-all shadow-xs flex items-center justify-center gap-2 touch-press"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Akun (Logout)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



