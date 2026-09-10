'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, Users, Baby } from 'lucide-react';
import { ChartCard } from './ChartCard';
import { GrowthDrillSheet } from './GrowthDrillSheet';
import { useBackLayer } from '@/lib/back-navigation';

type CategoryCount = { key: string; label: string; color: string; count: number; percent: number };
type GrowthResp = {
  success: boolean;
  indicator: string;
  summary: { total: number; measured: number; registered: number; unmeasured: number };
  categories: CategoryCount[];
  trend: Array<{ ym: string; total: number; categories: CategoryCount[]; problemRate: number }>;
};

const INDICATOR_OPTIONS = [
  { key: 'BB_U', label: 'Berat Badan / Umur (BB/U)' },
  { key: 'TB_U', label: 'Tinggi Badan / Umur (TB/U)' },
  { key: 'BB_TB', label: 'Berat / Tinggi Badan (BB/TB)' },
  { key: 'IMT_U', label: 'IMT / Umur (IMT/U)' },
];

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function GrowthStatusDistribution({ from, to }: { from: string; to: string }) {
  const [indicator, setIndicator] = useState('BB_U');
  const [data, setData] = useState<GrowthResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<{ key: string; label: string } | null>(null);

  useBackLayer(Boolean(drill), () => setDrill(null));

  useEffect(() => {
    let active = true;
    fetch(`/api/stats/growth?indicator=${indicator}&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => {
        if (active && d.success) setData(d);
      })
      .catch((e) => console.error('Gagal memuat status gizi:', e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [indicator, from, to]);

  const pie = useMemo(
    () => (data?.categories ?? []).filter((c) => c.count > 0).map((c) => ({ name: c.label, value: c.count, color: c.color })),
    [data],
  );

  const trend = useMemo(
    () => (data?.trend ?? []).map((t) => ({ name: formatYM(t.ym), masalah: Math.round(t.problemRate) })),
    [data],
  );

  const subtitle = INDICATOR_OPTIONS.find((o) => o.key === indicator)?.label ?? indicator;
  const hasStatus = !!data && data.summary.total > 0;

  return (
    <>
      <ChartCard title="Distribusi Status Gizi Balita" subtitle="Permenkes 2/2020 — pengukuran terakhir per anak">
        <div className="mb-3">
          <label className="block text-[10px] font-bold text-[#667781] uppercase tracking-wide mb-1">
            Indeks
          </label>
          <select
            value={indicator}
            onChange={(e) => {
              setLoading(true);
              setIndicator(e.target.value);
            }}
            className="w-full sm:w-72 bg-[#f0f2f5] border border-[#e9edef] rounded-xl px-3 py-2 text-xs font-bold text-[#111b21] outline-none focus:border-[#128c7e]"
          >
            {INDICATOR_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs font-bold text-[#54656f]">Memuat data status gizi...</p>
        ) : !hasStatus ? (
          <p className="py-8 text-center text-xs font-bold text-[#54656f]">
            Belum ada balita dengan status gizi terhitung pada periode ini.
          </p>
        ) : (
          <>
            <div role="img" aria-label="Distribusi status gizi balita">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {pie.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 space-y-1">
              {data.categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  disabled={c.count === 0}
                  onClick={() => setDrill({ key: c.key, label: c.label })}
                  className="w-full flex items-center justify-between text-[11px] text-left rounded-lg px-1 py-0.5 hover:bg-[#f0f2f5] disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <span className="flex items-center gap-1.5 font-bold text-[#54656f]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                    {c.label}
                  </span>
                  <span className="font-extrabold text-[#111b21]">
                    {c.count}{' '}
                    <span className="text-[#8696a0] font-bold">({c.percent.toFixed(1)}%)</span>
                    {c.count > 0 && <span className="text-[#128c7e] font-bold"> ›</span>}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-[#8696a0] font-medium">
              Kategori risiko gizi lebih &amp; tinggi digabung ke normal untuk cakupan program.
            </p>
          </>
        )}
      </ChartCard>

      {data && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center shadow-xs">
            <Baby className="w-5 h-5 text-[#075e54] mx-auto mb-1" />
            <p className="text-lg font-extrabold text-[#111b21]">{data.summary.total}</p>
            <p className="text-[10px] text-[#54656f] font-bold">Berstatus Gizi</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center shadow-xs">
            <Users className="w-5 h-5 text-[#075e54] mx-auto mb-1" />
            <p className="text-lg font-extrabold text-[#111b21]">{data.summary.measured}</p>
            <p className="text-[10px] text-[#54656f] font-bold">Terukur</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-extrabold text-[#b45309]">{data.summary.unmeasured}</p>
            <p className="text-[10px] text-[#54656f] font-bold">Belum Diukur</p>
          </div>
        </div>
      )}

      {trend.length > 1 && (
        <ChartCard title="Tren Masalah Gizi" subtitle={`% balita non-normal (${subtitle}) per bulan`}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9edef" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#8696a0" />
              <YAxis tick={{ fontSize: 10 }} stroke="#8696a0" unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="masalah" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {drill && (
        <GrowthDrillSheet
          key={`${indicator}-${drill.key}`}
          indicator={indicator}
          categoryKey={drill.key}
          categoryLabel={drill.label}
          indicatorLabel={subtitle}
          from={from}
          to={to}
          onClose={() => setDrill(null)}
        />
      )}
    </>
  );
}
