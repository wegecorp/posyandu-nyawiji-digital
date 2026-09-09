'use client';

import React from 'react';
import { PARTISIPASI_BURUK_THRESHOLD } from '@/lib/clinical';

interface ScoreboardRow {
  unitId: string;
  unitName: string;
  participation: number; // 0-1
  numerator: number;
  denominator: number;
  /** Optional extra fields for drill / detail */
  abnormal?: number;
  total?: number;
}

interface UnitScoreboardProps {
  title?: string;
  data: ScoreboardRow[];
  /** Called when user clicks a row (drill down). If not provided, rows are not clickable. */
  onDrill?: (unitId: string, unitName: string) => void;
  /** Column to sort by: 'participation' (default) or 'abnormal' */
  sortBy?: 'participation' | 'abnormal';
  /** Show abnormal column */
  showAbnormal?: boolean;
}

function isBuruk(participation: number): boolean {
  return participation < PARTISIPASI_BURUK_THRESHOLD;
}

export function UnitScoreboard({
  title = 'Ranking Unit',
  data,
  onDrill,
  sortBy = 'participation',
  showAbnormal = false,
}: UnitScoreboardProps) {
  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => {
    if (sortBy === 'abnormal') {
      return (b.abnormal ?? 0) - (a.abnormal ?? 0);
    }
    return a.participation - b.participation; // worst first
  });

  return (
    <div>
      {title && <h4 className="text-xs font-extrabold text-[#54656f] mb-2 uppercase tracking-wide">{title}</h4>}
      <div className="space-y-1.5">
        {sorted.map((row) => {
          const pct = Math.round(row.participation * 100);
          const buruk = isBuruk(row.participation);
          const barWidth = Math.max(4, pct); // min 4% so bar visible
          return (
            <button
              key={row.unitId}
              onClick={() => onDrill?.(row.unitId, row.unitName)}
              disabled={!onDrill}
              className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                onDrill
                  ? 'cursor-pointer hover:bg-[#f0f2f5] active:scale-[0.99]'
                  : 'cursor-default'
              } ${
                buruk
                  ? 'border-red-200 bg-red-50/50'
                  : 'border-[#e9edef] bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-[#111b21] truncate max-w-[60%]">
                  {row.unitName}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {showAbnormal && row.abnormal != null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      row.abnormal > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {row.abnormal} abnormal
                    </span>
                  )}
                  <span className={`text-xs font-extrabold ${buruk ? 'text-red-600' : 'text-green-600'}`}>
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-[#f0f2f5] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    buruk ? 'bg-red-400' : 'bg-green-400'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-[#8696a0]">
                  {row.numerator} / {row.denominator} pasien
                </span>
                {onDrill && (
                  <span className="text-[10px] text-[#075e54] font-bold">Detail →</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
