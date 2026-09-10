'use client';

import React, { useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';

interface ExitHintProps {
  show: boolean;
  onHide: () => void;
}

/** Toast singkat "tekan kembali sekali lagi" untuk pola back-dua-kali. */
export const ExitHint: React.FC<ExitHintProps> = ({ show, onHide }) => {
  const onHideRef = useRef(onHide);

  useEffect(() => {
    onHideRef.current = onHide;
  }, [onHide]);

  useEffect(() => {
    if (!show) return;
    const timer = window.setTimeout(() => onHideRef.current(), 2000);
    return () => window.clearTimeout(timer);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 w-full max-w-sm pointer-events-none">
      <div className="bg-[#075e54] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 border border-[#128c7e] animate-in fade-in slide-in-from-bottom-2 duration-150">
        <LogOut className="w-4 h-4 text-[#25d366] shrink-0" />
        <span>Tekan tombol kembali sekali lagi untuk keluar</span>
      </div>
    </div>
  );
};
