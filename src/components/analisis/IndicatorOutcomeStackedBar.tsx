'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
 * Hanya pasien yang sudah dinilai — belum dinilai tidak ditampilkan.
 */
export function IndicatorOutcomeStackedBar({
  data,
  ariaLabel = 'Distribusi hasil pengukuran per indikator',
}: {
  data: IndicatorOutcomeRow[];
  ariaLabel?: string;
}) {
  const rows = data.filter((d) => d.abnormal + d.normal > 0);
  if (rows.length === 0) return null;

  return (
    <div>
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
            <Bar dataKey="normal" name="Normal" stackId="a" fill="#22c55e" isAnimationActive={false} />
            <Bar
              dataKey="abnormal"
              name="Tidak Normal"
              stackId="a"
              fill="#ef4444"
              isAnimationActive={false}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {SEGMENTS.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px] font-bold text-[#54656f]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
