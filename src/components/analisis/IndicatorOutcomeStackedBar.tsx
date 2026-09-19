'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export type IndicatorOutcomeRow = {
  key: string;
  /** Label pendek untuk sumbu. */
  name: string;
  /** Label lengkap untuk tooltip. */
  fullLabel: string;
  abnormal: number;
  normal: number;
};

const SEGMENTS = [
  { key: 'abnormal', label: 'Tidak Normal', color: '#ef4444' },
  { key: 'normal', label: 'Normal', color: '#22c55e' },
] as const;

/**
 * Stacked bar per indikator klinis: Tidak Normal / Normal.
 * Mendukung klik baris untuk drilldown wilayah/pasien.
 */
export function IndicatorOutcomeStackedBar({
  data,
  onPick,
  ariaLabel = 'Distribusi hasil pengukuran per indikator',
}: {
  data: IndicatorOutcomeRow[];
  onPick?: (key: string, label: string) => void;
  ariaLabel?: string;
}) {
  const rows = data.filter((d) => d.abnormal + d.normal > 0);
  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Visual Grafik Bar Bertumpuk */}
      <div role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 44)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9edef" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} stroke="#8696a0" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10 }}
              stroke="#8696a0"
              width={104}
            />
            <Tooltip
              formatter={(value, name) => [`${value} pasien`, String(name)]}
              labelFormatter={(label, payload) => {
                const p = payload?.[0]?.payload as IndicatorOutcomeRow | undefined;
                return p?.fullLabel ?? String(label);
              }}
            />
            <Bar
              dataKey="normal"
              name="Normal"
              stackId="a"
              fill="#22c55e"
              isAnimationActive={false}
              cursor={onPick ? 'pointer' : 'default'}
              onClick={(entry) => {
                if (!onPick) return;
                const p = entry as unknown as { key?: string; payload?: IndicatorOutcomeRow };
                const row = p?.payload || (entry as unknown as IndicatorOutcomeRow);
                if (row?.key) onPick(row.key, row.fullLabel || row.name);
              }}
            />
            <Bar
              dataKey="abnormal"
              name="Tidak Normal"
              stackId="a"
              fill="#ef4444"
              isAnimationActive={false}
              radius={[0, 4, 4, 0]}
              cursor={onPick ? 'pointer' : 'default'}
              onClick={(entry) => {
                if (!onPick) return;
                const p = entry as unknown as { key?: string; payload?: IndicatorOutcomeRow };
                const row = p?.payload || (entry as unknown as IndicatorOutcomeRow);
                if (row?.key) onPick(row.key, row.fullLabel || row.name);
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {SEGMENTS.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px] font-bold text-[#54656f]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      {/* Rincian Kartu Interaktif per Indikator */}
      <div className="pt-2 border-t border-[#f0f2f5] space-y-1.5">
        {rows.map((row) => {
          const total = row.normal + row.abnormal;
          const abnormalPercent = total > 0 ? Math.round((row.abnormal / total) * 100) : 0;
          const hasAbnormal = row.abnormal > 0;

          return (
            <button
              key={row.key}
              type="button"
              disabled={!onPick}
              onClick={() => onPick?.(row.key, row.fullLabel || row.name)}
              className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition-all ${
                onPick
                  ? 'bg-white hover:bg-[#f0f2f5] border-[#e9edef] hover:border-[#128c7e] cursor-pointer touch-press'
                  : 'bg-[#f0f2f5] border-[#e9edef] cursor-default'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-[#111b21] truncate">{row.fullLabel || row.name}</p>
                <div className="flex items-center gap-3 text-[11px] mt-0.5 text-[#54656f]">
                  <span className="flex items-center gap-1 text-[#15803d]">
                    <CheckCircle2 className="w-3 h-3 text-[#16a34a]" />
                    <span>{row.normal} normal</span>
                  </span>
                  {hasAbnormal ? (
                    <span className="flex items-center gap-1 text-[#dc2626] font-bold">
                      <AlertCircle className="w-3 h-3 text-[#ef4444]" />
                      <span>
                        {row.abnormal} tidak normal ({abnormalPercent}%)
                      </span>
                    </span>
                  ) : (
                    <span className="text-[#15803d] font-semibold">100% normal</span>
                  )}
                </div>
              </div>

              {onPick && hasAbnormal && (
                <div className="flex items-center gap-1 text-xs font-bold text-[#128c7e] shrink-0">
                  <span>Rincian</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
