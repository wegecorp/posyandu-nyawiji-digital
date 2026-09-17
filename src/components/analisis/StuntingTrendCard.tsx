'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartCard } from './ChartCard';

type Resp = {
  success: boolean;
  trend: Array<{ ym: string; total: number; problemRate: number }>;
};

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

/** Tren prevalensi stunting (TB/U) — % balita Pendek & Sangat Pendek per bulan. */
export function StuntingTrendCard({ from, to, hcId }: { from: string; to: string; hcId?: string }) {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats/growth?indicator=TB_U&from=${from}&to=${to}${hcId ? `&hcId=${hcId}` : ''}`);
        const d = await res.json();
        if (active && d.success) setData(d);
      } catch (e) {
        console.error('Gagal memuat tren stunting:', e);
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [from, to, hcId]);

  const trend = useMemo(
    () =>
      (data?.trend ?? [])
        .filter((t) => t.total > 0)
        .map((t) => ({ name: formatYM(t.ym), stunting: Math.round(t.problemRate) })),
    [data],
  );

  if (loading) {
    return (
      <ChartCard title="Tren Stunting (TB/U)">
        <p className="py-6 text-center text-xs font-bold text-[#54656f]">Memuat data...</p>
      </ChartCard>
    );
  }

  if (trend.length === 0) {
    return null;
  }

  const latest = trend[trend.length - 1]?.stunting ?? 0;

  return (
    <ChartCard
      title="Tren Stunting (TB/U)"
      subtitle={`% balita Pendek & Sangat Pendek per bulan — terakhir ${latest}%`}
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={trend}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9edef" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#8696a0" />
          <YAxis tick={{ fontSize: 10 }} stroke="#8696a0" unit="%" domain={[0, 100]} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Line type="monotone" dataKey="stunting" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
