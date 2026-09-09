'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface PeriodControlProps {
  selected: string;
  onChange: (value: string) => void;
}

const PRESETS = [
  { label: '6 bulan', value: '6m' },
  { label: '12 bulan', value: '12m' },
  { label: '24 bulan', value: '24m' },
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function getDefaultDateRange(months: number): { from: string; to: string } {
  const now = new Date();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from, to };
}

export function periodToRange(value: string): { from: string; to: string } {
  if (value.includes('|')) {
    const parts = value.split('|');
    if (parts.length === 2) return { from: parts[0], to: parts[1] };
  }
  const months = parseInt(value.replace('m', ''), 10);
  if (!isNaN(months)) return getDefaultDateRange(months);
  return getDefaultDateRange(12);
}

/** Ekstrak YYYY-MM dari nilai custom, atau null. */
function customMonthOf(value: string): string | null {
  if (!value.includes('|')) return null;
  return value.split('|')[0].slice(0, 7);
}

/** Nama bulan pendek utk label custom, mis. "Jun 2026". */
function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MONTHS_SHORT[parseInt(m, 10) - 1]} ${y}`;
}

export function PeriodControl({ selected, onChange }: PeriodControlProps) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const customYM = customMonthOf(selected);
  const [viewYear, setViewYear] = useState(() => {
    if (customYM) return parseInt(customYM.split('-')[0], 10);
    return now.getFullYear();
  });

  const rootRef = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar / Escape
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pickMonth = (monthIndex: number) => {
    const ym = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    const lastDay = new Date(viewYear, monthIndex + 1, 0).getDate();
    onChange(`${ym}-01|${ym}-${String(lastDay).padStart(2, '0')}`);
    setOpen(false);
  };

  return (
    <div className="relative flex items-center gap-1.5 flex-wrap" ref={rootRef}>
      {PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          aria-pressed={selected === p.value}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
            selected === p.value
              ? 'bg-[#075e54] text-white border-[#075e54] shadow-xs'
              : 'bg-white text-[#111b21] border-[#e9edef] hover:bg-[#f0f2f5] active:bg-[#e7fceb]'
          }`}
        >
          {p.label}
        </button>
      ))}

      {/* Custom month trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (customYM) setViewYear(parseInt(customYM.split('-')[0], 10));
        }}
        aria-expanded={open}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
          customYM
            ? 'bg-[#e7fceb] text-[#075e54] border-[#075e54] shadow-xs'
            : 'bg-white text-[#54656f] border-[#e9edef] hover:bg-[#f0f2f5]'
        }`}
      >
        <Calendar className="w-3.5 h-3.5" />
        {customYM ? formatYM(customYM) : 'Bulan...'}
      </button>

      {/* Dropdown kalender */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-white rounded-2xl border border-[#e9edef] shadow-xl p-3">
          <div className="text-[11px] font-extrabold text-[#111b21] mb-2">
            Pilih bulan untuk fokus pemaparan
          </div>

          {/* Tahun nav */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#54656f] hover:bg-[#f0f2f5] cursor-pointer transition-all"
              aria-label="Tahun sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-extrabold text-[#111b21]">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              disabled={viewYear >= now.getFullYear()}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#54656f] hover:bg-[#f0f2f5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
              aria-label="Tahun berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Grid bulan */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS_SHORT.map((label, i) => {
              const ym = `${viewYear}-${String(i + 1).padStart(2, '0')}`;
              const isFuture = ym > nowYM;
              const isSelected = ym === customYM;
              return (
                <button
                  key={ym}
                  type="button"
                  disabled={isFuture}
                  onClick={() => pickMonth(i)}
                  className={`relative flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all border cursor-pointer disabled:cursor-not-allowed disabled:opacity-35 disabled:text-[#cbd5e1] ${
                    isSelected
                      ? 'bg-[#075e54] text-white border-[#075e54] shadow-xs'
                      : 'border-[#e9edef] bg-white text-[#111b21] hover:bg-[#f0f2f5]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 shrink-0" />}
                  {label}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-[10px] text-[#8696a0] font-medium">
            Satu bulan terpilih: laporan fokus 1 bulan penuh.
          </p>
        </div>
      )}
    </div>
  );
}
