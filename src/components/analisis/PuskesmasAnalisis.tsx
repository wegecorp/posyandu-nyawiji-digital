'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ChartCard } from './ChartCard';
import { GrowthStatusDistribution } from './GrowthStatusDistribution';
import { GrowthProblemRanking } from './GrowthProblemRanking';
import { StuntingTrendCard } from './StuntingTrendCard';
import { WeightProgressionCard } from './WeightProgressionCard';
import { BreastfeedingCard } from './BreastfeedingCard';
import { CategoryCoverageCard } from './CategoryCoverageCard';
import { TbScreeningCard } from './TbScreeningCard';
import { OutcomeDonut } from './OutcomeDonut';
import { IndicatorDrillSheet } from './IndicatorDrillSheet';
import { PeriodControl, periodToRange } from './PeriodControl';
import { UnitScoreboard } from './UnitScoreboard';
import { EmptyState } from './EmptyState';
import { PARTISIPASI_BURUK_THRESHOLD, INDICATORS } from '@/lib/clinical';
import { useBackLayer } from '@/lib/back-navigation';
import { AnalisisPageSkeleton } from '@/components/Skeleton';


type CoverageData = { ym: string; unitId: string; unitName: string; numerator: number; denominator: number; participation: number };
type OutcomeData = { ym: string; unitId: string; unitName: string; total: number; normal: number; abnormal: number; notAssessed: number; abnormalByIndicator: Record<string, number> };

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
  const [indicatorDrill, setIndicatorDrill] = useState<{ key: string; label: string } | null>(null);

  useBackLayer(Boolean(indicatorDrill), () => setIndicatorDrill(null));

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

  // Bulan terakhir yang benar-benar punya data ukur (bukan bulan berjalan kosong).
  const latestMonth = useMemo(() => {
    const withData = posyanduCoverage.filter((d) => d.numerator > 0).map((d) => d.ym);
    return withData.sort().at(-1) ?? '';
  }, [posyanduCoverage]);

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

  // Scoreboard (posyandu ranking) — agregat seluruh periode terpilih.
  const scoreboard = useMemo(() => {
    const agg = new Map<string, { unitId: string; unitName: string; numerator: number; denominator: number }>();
    for (const d of posyanduCoverage) {
      const cur = agg.get(d.unitId) ?? { unitId: d.unitId, unitName: d.unitName, numerator: 0, denominator: 0 };
      cur.numerator += d.numerator;
      cur.denominator += d.denominator;
      cur.unitName = d.unitName;
      agg.set(d.unitId, cur);
    }
    return [...agg.values()].map(d => ({
      unitId: d.unitId, unitName: d.unitName,
      participation: d.denominator > 0 ? d.numerator / d.denominator : 0,
      numerator: d.numerator, denominator: d.denominator,
    }));
  }, [posyanduCoverage]);

  // Outcome pie — agregat SELURUH posyandu utk bulan tsb (jangan find yg ambil 1 baris)
  const latestOutcome = useMemo(() => {
    const rows = posyanduOutcome.filter(d => d.ym === latestMonth);
    if (rows.length === 0) return null;
    const merged: { total: number; normal: number; abnormal: number; notAssessed: number; abnormalByIndicator: Record<string, number> } = { total: 0, normal: 0, abnormal: 0, notAssessed: 0, abnormalByIndicator: {} };
    for (const r of rows) {
      merged.total += r.total;
      merged.normal += r.normal;
      merged.abnormal += r.abnormal;
      merged.notAssessed += r.notAssessed;
      for (const [k, v] of Object.entries(r.abnormalByIndicator)) {
        merged.abnormalByIndicator[k] = (merged.abnormalByIndicator[k] ?? 0) + v;
      }
    }
    return merged;
  }, [posyanduOutcome, latestMonth]);

  const pieData = useMemo(() => {
    if (!latestOutcome) return [];
    return [
      { name: 'Normal', value: latestOutcome.normal },
      { name: 'Tidak Normal', value: latestOutcome.abnormal },
      { name: 'Belum Dinilai', value: latestOutcome.notAssessed },
    ];
  }, [latestOutcome]);

  const normalPct = useMemo(() => {
    if (!latestOutcome) return 0;
    const assessed = latestOutcome.normal + latestOutcome.abnormal;
    return assessed > 0 ? Math.round((latestOutcome.normal / assessed) * 100) : 0;
  }, [latestOutcome]);

  const abnormalByIndicator = useMemo(() => {
    if (!latestOutcome) return [];
    return INDICATORS
      .map((ind) => ({ key: ind.key, label: ind.label, count: latestOutcome.abnormalByIndicator[ind.key] ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [latestOutcome]);

  const activeDenominator = useMemo(() => {
    return posyanduCoverage
      .filter((d) => d.ym === latestMonth)
      .reduce((sum, d) => sum + d.denominator, 0);
  }, [posyanduCoverage, latestMonth]);

  if (loading && posyanduCoverage.length === 0) {
    return <AnalisisPageSkeleton />;
  }

  const hasAnyData = posyanduCoverage.some((d) => d.numerator > 0);
  if (!hasAnyData) {
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

      {/* LEVEL 1: RINGKASAN KPI, DEMOGRAFI & CAKUPAN PARTISIPASI (MAKRO) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center shadow-xs">
          <Users className="w-5 h-5 text-[#075e54] mx-auto mb-1" />
          <p className="text-lg font-extrabold text-[#111b21]">
            {activeDenominator.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-[#54656f] font-bold">Terdaftar ({scoreboard.length} Posyandu)</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center shadow-xs">
          <TrendingUp className="w-5 h-5 text-[#075e54] mx-auto mb-1" />
          <p className="text-lg font-extrabold text-[#111b21]">
            {normalPct}%
          </p>
          <p className="text-[10px] text-[#54656f] font-bold">Hasil Normal</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-lg font-extrabold text-red-600">
            {(latestOutcome?.abnormal ?? 0).toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-[#54656f] font-bold">Perlu Perhatian</p>
        </div>
      </div>

      {/* 1a. Cakupan & Distribusi Kelompok Sasaran (Lansia s/d Bayi) */}
      <CategoryCoverageCard from={from} to={to} />

      {/* 1b. Tren Garis Partisipasi Bulanan */}
      {trendData.length > 0 && (
        <ChartCard title="Tren Partisipasi Puskesmas" subtitle="Aggregate seluruh Posyandu">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9edef" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#8696a0" />
              <YAxis tick={{ fontSize: 10 }} stroke="#8696a0" unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="partisipasi" stroke="#075e54" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 1c. Ranking Partisipasi Posyandu */}
      {scoreboard.length > 0 && (
        <ChartCard
          title="Ranking Partisipasi Posyandu"
          subtitle={`Agregat ${formatYM(from.slice(0, 7))}–${formatYM(to.slice(0, 7))} — merah < ${PARTISIPASI_BURUK_THRESHOLD * 100}%`}
        >
          <UnitScoreboard data={scoreboard} />
        </ChartCard>
      )}

      {/* LEVEL 2: HASIL SKRINING & TEMUAN KLINIS UMUM */}
      {/* 2a. Donut Distribusi Hasil Pengukuran */}
      {pieData.length > 0 && pieData.some(d => d.value > 0) && (
        <ChartCard title="Distribusi Hasil Pengukuran" subtitle={`Bulan ${formatYM(latestMonth)}`}>
          <OutcomeDonut data={pieData} />
        </ChartCard>
      )}

      {/* 2b. Temuan per indikator — klik untuk detail per posyandu */}
      {abnormalByIndicator.length > 0 && (
        <ChartCard title="Temuan Tidak Normal per Indikator" subtitle={`Bulan ${formatYM(latestMonth)} — klik untuk lihat per posyandu`}>
          <div className="space-y-1.5">
            {abnormalByIndicator.map((ind) => (
              <button
                key={ind.key}
                type="button"
                onClick={() => setIndicatorDrill({ key: ind.key, label: ind.label })}
                className="w-full flex items-center justify-between gap-2 bg-white rounded-xl border border-[#e9edef] p-2.5 text-left hover:bg-[#f0f2f5] transition-colors"
              >
                <span className="text-xs font-bold text-[#111b21] truncate">{ind.label}</span>
                <span className="text-xs font-extrabold text-red-600 shrink-0">
                  {ind.count} <span className="text-[#128c7e]">›</span>
                </span>
              </button>
            ))}
          </div>
        </ChartCard>
      )}

      {/* LEVEL 3: PROGRAM PRIORITAS GIZI BALITA & KHUSUS (SPESIFIK) */}
      {/* 3a. Status gizi balita (Permenkes 2/2020) */}
      <GrowthStatusDistribution from={from} to={to} />

      {/* 3b. Peringkat prevalensi masalah gizi per wilayah */}
      <GrowthProblemRanking from={from} to={to} />

      {/* 3c. Tren stunting (TB/U) */}
      <StuntingTrendCard from={from} to={to} />

      {/* 3d. Progres berat badan (N/T & 2T) */}
      <WeightProgressionCard from={from} to={to} />

      {/* 3e. ASI Eksklusif & Skrining TB */}
      <BreastfeedingCard from={from} to={to} />
      <TbScreeningCard from={from} to={to} />

      {indicatorDrill && (
        <IndicatorDrillSheet
          indicator={indicatorDrill.key}
          label={indicatorDrill.label}
          from={from}
          to={to}
          onClose={() => setIndicatorDrill(null)}
        />
      )}
    </div>
  );
}
