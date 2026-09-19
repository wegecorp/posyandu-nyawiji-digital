'use client';

import React, { useState, useMemo } from 'react';
import {
  Award,
  Activity,
  Percent,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
} from 'lucide-react';
import { PARTISIPASI_BURUK_THRESHOLD } from '@/lib/clinical';

export interface ScoreboardRow {
  unitId: string;
  unitName: string;
  participation: number; // 0-1
  numerator: number;
  denominator: number;
  /** Optional extra fields for drill / detail */
  abnormal?: number;
  total?: number;
  /** Perubahan partisipasi vs bulan sebelumnya, dalam poin persen. null bila tak ada pembanding. */
  delta?: number | null;
}

export type ScoreboardSortMode = 'performance' | 'volume' | 'participation' | 'abnormal';

interface UnitScoreboardProps {
  title?: string;
  data: ScoreboardRow[];
  /** Called when user clicks a row (drill down). If not provided, rows are not clickable. */
  onDrill?: (unitId: string, unitName: string) => void;
  /** Initial or fixed sort column: 'performance' (default), 'volume', 'participation', or 'abnormal' */
  sortBy?: ScoreboardSortMode;
  /** Show abnormal column */
  showAbnormal?: boolean;
  /** Enable interactive sort toggle buttons */
  showSortToggle?: boolean;
}

function isBuruk(participation: number): boolean {
  return participation < PARTISIPASI_BURUK_THRESHOLD;
}

export function UnitScoreboard({
  title = 'Ranking Unit',
  data,
  onDrill,
  sortBy = 'performance',
  showAbnormal = false,
  showSortToggle = true,
}: UnitScoreboardProps) {
  const [activeSort, setActiveSort] = useState<ScoreboardSortMode>(sortBy);

  const maxNumerator = useMemo(() => {
    return Math.max(...data.map((d) => d.numerator), 1);
  }, [data]);

  // Hitung skor komposit (0 - 100): 50% kelengkapan sasaran (% cakupan) + 50% keaktifan entri (skala volume relatif)
  const scoredData = useMemo(() => {
    return data.map((row) => {
      const coverageScore = row.participation * 100;
      const volumeScore = (row.numerator / maxNumerator) * 100;
      const performanceScore =
        row.denominator === 0
          ? 0
          : Math.round(((coverageScore * 0.5) + (volumeScore * 0.5)) * 10) / 10;

      return {
        ...row,
        performanceScore,
        volumeScore,
      };
    });
  }, [data, maxNumerator]);

  const sorted = useMemo(() => {
    return [...scoredData].sort((a, b) => {
      if (activeSort === 'abnormal') {
        return (b.abnormal ?? 0) - (a.abnormal ?? 0);
      }
      if (activeSort === 'volume') {
        if (b.numerator !== a.numerator) return b.numerator - a.numerator;
        return b.participation - a.participation;
      }
      if (activeSort === 'participation') {
        if (b.participation !== a.participation) return b.participation - a.participation;
        return b.numerator - a.numerator;
      }
      // default: 'performance' (skor komposit adil)
      if (b.performanceScore !== a.performanceScore) return b.performanceScore - a.performanceScore;
      if (b.numerator !== a.numerator) return b.numerator - a.numerator;
      return b.participation - a.participation;
    });
  }, [scoredData, activeSort]);

  if (data.length === 0) return null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        {title && (
          <h4 className="text-xs font-extrabold text-[#54656f] uppercase tracking-wide">
            {title}
          </h4>
        )}
        {showSortToggle && !showAbnormal && data.length > 1 && (
          <div className="flex items-center gap-1 bg-[#f0f2f5] p-0.5 rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveSort('performance')}
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md transition-colors ${
                activeSort === 'performance'
                  ? 'bg-white text-[#075e54] shadow-xs'
                  : 'text-[#54656f] hover:text-[#111b21]'
              }`}
              title="Kinerja: Menggabungkan volume entri data & kelengkapan sasaran"
            >
              <Award className="w-3.5 h-3.5 text-[#075e54]" />
              <span>Kinerja</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSort('volume')}
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md transition-colors ${
                activeSort === 'volume'
                  ? 'bg-white text-[#075e54] shadow-xs'
                  : 'text-[#54656f] hover:text-[#111b21]'
              }`}
              title="Paling Aktif: Diurutkan berdasarkan jumlah pasien yang dientri"
            >
              <Activity className="w-3.5 h-3.5 text-[#075e54]" />
              <span>Paling Aktif</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSort('participation')}
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md transition-colors ${
                activeSort === 'participation'
                  ? 'bg-white text-[#075e54] shadow-xs'
                  : 'text-[#54656f] hover:text-[#111b21]'
              }`}
              title="Cakupan: Diurutkan berdasarkan persentase kehadiran sasaran"
            >
              <Percent className="w-3.5 h-3.5 text-[#075e54]" />
              <span>% Cakupan</span>
            </button>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {sorted.map((row, idx) => {
          const noData = row.denominator === 0;
          const pct = Math.round(row.participation * 100);
          const buruk = !noData && isBuruk(row.participation);

          // Bar width mengikuti mode sortir aktif
          let barWidth = 0;
          if (!noData) {
            if (activeSort === 'performance') barWidth = Math.min(100, Math.round(row.performanceScore));
            else if (activeSort === 'volume') barWidth = Math.min(100, Math.round((row.numerator / maxNumerator) * 100));
            else barWidth = pct;
          }

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
                  ? 'border-red-200 bg-red-50/40'
                  : 'border-[#e9edef] bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                  <span className="text-[#8696a0] font-extrabold text-xs shrink-0">
                    {idx + 1}.
                  </span>
                  <span className="text-xs font-bold text-[#111b21] truncate">
                    {row.unitName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {row.delta != null && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        row.delta > 0
                          ? 'bg-green-100 text-green-700'
                          : row.delta < 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-[#f0f2f5] text-[#54656f]'
                      }`}
                      title="Perubahan vs bulan sebelumnya"
                    >
                      {row.delta > 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-700" />
                      ) : row.delta < 0 ? (
                        <TrendingDown className="w-3 h-3 text-red-700" />
                      ) : (
                        <Minus className="w-3 h-3 text-[#54656f]" />
                      )}
                      <span>{Math.abs(row.delta)} pts</span>
                    </span>
                  )}
                  {showAbnormal && row.abnormal != null && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        row.abnormal > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {row.abnormal} abnormal
                    </span>
                  )}
                  {activeSort === 'performance' && !noData && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#e8f5e9] text-[#1b5e20] border border-[#c8e6c9]">
                      Skor {row.performanceScore}
                    </span>
                  )}
                  <span
                    className={`text-xs font-extrabold ${
                      noData ? 'text-[#8696a0]' : buruk ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {noData ? 'tanpa data' : `${pct}%`}
                  </span>
                </div>
              </div>

              <div className="h-1.5 bg-[#f0f2f5] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    buruk ? 'bg-red-400' : 'bg-[#075e54]'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-1 text-[10px] text-[#8696a0]">
                <span>
                  {noData
                    ? 'Belum ada sasaran terdaftar'
                    : `${row.numerator.toLocaleString('id-ID')} / ${row.denominator.toLocaleString('id-ID')} pasien terukur`}
                </span>
                {onDrill && (
                  <span className="inline-flex items-center text-[#075e54] font-bold">
                    <span>Detail</span>
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
