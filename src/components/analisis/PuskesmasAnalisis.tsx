'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ChartCard } from './ChartCard';
import { PeriodControl, periodToRange } from './PeriodControl';
import { UnitScoreboard } from './UnitScoreboard';
import { EmptyState } from './EmptyState';
import { PARTISIPASI_BURUK_THRESHOLD } from '@/lib/clinical';

type CoverageData = { ym: string; unitId: string; unitName: string; numerator: number; denominator: number; participation: number };
type OutcomeData = { ym: string; unitId: string; unitName: string; total: number; normal: number; abnormal: number; abnormalByIndicator: Record<string, number> };

const PIE_COLORS = ['#22c55e', '#ef4444'];

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function PuskesmasAnalisis() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('12m');
  const [posyanduCoverage, setPosyanduCoverage] = useState<CoverageData[]>([]);
  const [posyanduOutcome, setPosyanduOutcome] = useState<OutcomeData[]>([]);
  const [loading, setLoading] = useState(true);

  const { from, to } = useMemo(() => periodToRange(period), [period]);

  useEffect(() => {
    if (!user?.healthCenterId) return;
    Promise.all([
      fetch(`/api/stats/coverage?scope=posyandu&from=${from}&to=${to}`).then(r => r.json()),
      fetch(`/api/stats/outcomes?scope=posyandu&from=${from}&to=${to}`).then(r => r.json()),
    ]).then(([cov, out]) => {
      if (cov.success) setPosyanduCoverage(cov.data);
      if (out.success) setPosyanduOutcome(out.data);
    }).finally(() => setLoading(false));
  }, [from, to, user?.healthCenterId]);

  const latestMonth = posyanduCoverage.length > 0 ? posyanduCoverage[posyanduCoverage.length - 1].ym : '';

  // Trend (aggregate all posyandu this puskesmas)
  const trendData = useMemo(() => {
    const byYm = new Map<string, { numerator: number; denominator: number }>();
    for (const d of posyanduCoverage) {
      const existing = byYm.get(d.ym);
      if (existing) {
        existing.numerator += d.numerator;
        existing.denominator += d.denominator;
      } else {
        byYm.set(d.ym, { numerator: d.numerator, denominator: d.denominator });
      }
    }
    return Array.from(byYm.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, v]) => ({
        name: formatYM(ym),
        partisipasi: v.denominator > 0 ? Math.round((v.numerator / v.denominator) * 100) : 0,
      }));
  }, [posyanduCoverage]);

  // Scoreboard (posyandu ranking)
  const scoreboard = useMemo(() => {
    return posyanduCoverage
      .filter(d => d.ym === latestMonth)
      .map(d => ({
        unitId: d.unitId, unitName: d.unitName,
        participation: d.participation, numerator: d.numerator, denominator: d.denominator,
      }));
  }, [posyanduCoverage, latestMonth]);

  // Outcome pie
  const latestOutcome = posyanduOutcome.find(d => d.ym === latestMonth);
  const pieData = useMemo(() => {
    if (!latestOutcome) return [];
    return [
      { name: 'Normal', value: latestOutcome.normal },
      { name: 'Tidak Normal', value: latestOutcome.abnormal },
    ];
  }, [latestOutcome]);

  if (loading && posyanduCoverage.length === 0) {
    return <div className="p-8 text-center text-sm font-bold text-[#54656f]">Memuat data statistik...</div>;
  }

  if (posyanduCoverage.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#111b21]">Analisis Puskesmas</h2>
          <PeriodControl selected={period} onChange={setPeriod} />
        </div>
        <EmptyState title="Belum ada data pengukuran" description="Data pengukuran dari Posyandu akan muncul di sini." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-extrabold text-[#111b21]">Analisis Puskesmas</h2>
        <PeriodControl selected={period} onChange={setPeriod} />
      </div>

      {/* 1. Trend Line */}
      {trendData.length > 0 && (
        <ChartCard title="Tren Partisipasi Puskesmas" subtitle="Aggregate seluruh Posyandu">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9edef" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#8696a0" />
              <YAxis tick={{ fontSize: 10 }} stroke="#8696a0" unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="partisipasi" stroke="#075e54" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 2. Ranking Posyandu */}
      {scoreboard.length > 0 && (
        <ChartCard
          title="Ranking Partisipasi Posyandu"
          subtitle={`Bulan terakhir: ${formatYM(latestMonth)} — merah < ${PARTISIPASI_BURUK_THRESHOLD * 100}%`}
        >
          <UnitScoreboard data={scoreboard} />
        </ChartCard>
      )}

      {/* 3. Donut */}
      {pieData.length > 0 && pieData.some(d => d.value > 0) && (
        <ChartCard title="Distribusi Hasil Pengukuran" subtitle={`Bulan ${formatYM(latestMonth)}`}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"                 label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 4. Stat cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center shadow-xs">
          <TrendingUp className="w-5 h-5 text-[#075e54] mx-auto mb-1" />
          <p className="text-lg font-extrabold text-[#111b21]">
            {latestOutcome ? Math.round((latestOutcome.normal / (latestOutcome.total || 1)) * 100) : 0}%
          </p>
          <p className="text-[10px] text-[#54656f] font-bold">Normal</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-lg font-extrabold text-red-600">{latestOutcome?.abnormal ?? 0}</p>
          <p className="text-[10px] text-[#54656f] font-bold">Tidak Normal</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center shadow-xs">
          <Users className="w-5 h-5 text-[#075e54] mx-auto mb-1" />
          <p className="text-lg font-extrabold text-[#111b21]">
            {scoreboard.length}
          </p>
          <p className="text-[10px] text-[#54656f] font-bold">Posyandu</p>
        </div>
      </div>
    </div>
  );
}
