'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export type OutcomeSlice = { name: string; value: number };

const COLORS = ['#22c55e', '#ef4444', '#cbd5e1'];

/**
 * Donut hasil pengukuran + legend ber-persentase.
 * Label sengaja tidak ditempel di potongan (dulu mentok tepi di mobile);
 * info pindah ke legend di bawah. Lihat docs/audit-visualisasi.md F20.
 */
export function OutcomeDonut({
  data,
  ariaLabel = 'Distribusi hasil pengukuran',
}: {
  data: OutcomeSlice[];
  ariaLabel?: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (total === 0) return null;

  return (
    <div>
      <div role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              dataKey="value"
              isAnimationActive={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) => [
                `${v} (${total > 0 ? Math.round((Number(v) / total) * 100) : 0}%)`,
                n,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 space-y-1">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-bold text-[#54656f]">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {d.name}
            </span>
            <span className="font-extrabold text-[#111b21]">
              {d.value}{' '}
              <span className="text-[#8696a0] font-bold">
                ({total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0'}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
