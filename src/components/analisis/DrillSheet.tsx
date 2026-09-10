'use client';

import React from 'react';
import { ArrowLeft, X } from 'lucide-react';

/**
 * Bottom-sheet drill-down untuk detail analisis.
 * Mobile-first: muncul dari bawah di HP, dialog tengah di layar besar.
 */
export function DrillSheet({
  title,
  subtitle,
  onClose,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-[#f0f2f5] w-full sm:max-w-lg rounded-t-[24px] sm:rounded-[24px] max-h-[85vh] flex flex-col overflow-hidden border border-[#e9edef] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#075e54] text-white p-4 flex items-center gap-3 shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-full hover:bg-white/15 text-white/90 shrink-0"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-sm truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-[#d1fae5] truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/90 shrink-0"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
