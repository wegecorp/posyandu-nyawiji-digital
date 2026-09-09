'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

interface PeriodControlProps {
  selected: string;
  onChange: (value: string) => void;
}

const PRESETS = [
  { label: '6 bulan', value: '6m' },
  { label: '12 bulan', value: '12m' },
  { label: '24 bulan', value: '24m' },
];

function getDefaultDateRange(months: number): { from: string; to: string } {
  const now = new Date();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from, to };
}

export function periodToRange(value: string): { from: string; to: string } {
  if (value === 'custom') {
    // Parse from the value itself
    const parts = value.split('|');
    if (parts.length === 2) return { from: parts[0], to: parts[1] };
  }
  const months = parseInt(value.replace('m', ''), 10);
  if (!isNaN(months)) return getDefaultDateRange(months);
  return getDefaultDateRange(12);
}

export function PeriodControl({ selected, onChange }: PeriodControlProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
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
      <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[#54656f] border border-[#e9edef] bg-white cursor-pointer hover:bg-[#f0f2f5] transition-all">
        <Calendar className="w-3.5 h-3.5" />
        <input
          type="month"
          className="sr-only"
          value={selected.includes('|') ? selected.split('|')[0].slice(0, 7) : ''}
          onChange={(e) => {
            const from = `${e.target.value}-01`;
            const [y, m] = e.target.value.split('-').map(Number);
            const lastDay = new Date(y, m, 0).getDate();
            const to = `${e.target.value}-${String(lastDay).padStart(2, '0')}`;
            onChange(`${from}|${to}`);
          }}
        />
        Bulan...
      </label>
    </div>
  );
}
