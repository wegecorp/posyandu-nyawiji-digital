'use client';

import React from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';
import { useBackLayer, exitApp } from '@/lib/back-navigation';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({ isOpen, onClose }) => {
  useBackLayer(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden border border-[#e9edef] animate-in zoom-in-95 duration-150">
        <div className="bg-[#075e54] text-white p-4.5 flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <AlertTriangle className="w-5 h-5 text-[#fbbf24]" />
          </div>
          <div>
            <h2 className="font-extrabold text-base leading-tight">Keluar Aplikasi?</h2>
            <p className="text-xs text-[#d1fae5] mt-0.5">Anda akan menutup POSYANDU NYAWIJI</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-[#54656f] text-center">
            Tekan <strong>Keluar</strong> untuk menutup aplikasi, atau <strong>Batal</strong> untuk
            kembali ke halaman sebelumnya.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#111b21] font-bold rounded-full text-xs transition-all touch-press border border-[#e9edef]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={exitApp}
              className="flex-1 py-3 px-4 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold rounded-full text-xs transition-all shadow-md flex items-center justify-center gap-2 touch-press"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
