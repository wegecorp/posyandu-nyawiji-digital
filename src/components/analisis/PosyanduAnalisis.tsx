'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertTriangle, Users } from 'lucide-react';
import { PatientAvatar } from '@/components/PatientAvatar';
import { useAuth } from '@/lib/auth-context';
import { ChartCard } from './ChartCard';
import { GrowthStatusDistribution } from './GrowthStatusDistribution';
import { StuntingTrendCard } from './StuntingTrendCard';
import { WeightProgressionCard } from './WeightProgressionCard';
import { BreastfeedingCard } from './BreastfeedingCard';
import { CategoryCoverageCard } from './CategoryCoverageCard';
import { TbScreeningCard } from './TbScreeningCard';
import { IndicatorOutcomeStackedBar } from './IndicatorOutcomeStackedBar';
import { PeriodControl, periodToRange } from './PeriodControl';
import { EmptyState } from './EmptyState';
import { INDICATORS } from '@/lib/clinical';
import { AnalisisPageSkeleton } from '@/components/Skeleton';

type CoverageData = { ym: string; unitId: string; unitName: string; numerator: number; denominator: number; participation: number };
type OutcomeData = {
  ym: string;
  unitId: string;
  unitName: string;
  total: number;
  normal: number;
  abnormal: number;
  notAssessed: number;
  abnormalByIndicator: Record<string, number>;
  assessedByIndicator?: Record<string, number>;
};
type AbnormalPatient = {
  measurementId: string; patientName: string; regNumber: string; category: string | null;
  indicatorKey: string; indicatorLabel: string; unit: string; value: number | string;
  posyanduId: string; posyanduName: string; kalurahan: string; ym: string;
};

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function PosyanduAnalisis() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('12m');
  const [coverage, setCoverage] = useState<CoverageData[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeData[]>([]);
  const [abnormalPatients, setAbnormalPatients] = useState<AbnormalPatient[]>([]);
  const [loading, setLoading] = useState(true);

  const { from, to } = useMemo(() => periodToRange(period), [period]);

  useEffect(() => {
    if (!user?.posyanduId) return;
    Promise.all([
      fetch(`/api/stats/coverage?scope=posyandu&from=${from}&to=${to}`).then(r => r.json()),
      fetch(`/api/stats/outcomes?scope=posyandu&from=${from}&to=${to}`).then(r => r.json()),
      fetch(`/api/stats/abnormal-patients?from=${from}&to=${to}`).then(r => r.json()),
    ]).then(([cov, out, abn]) => {
      if (cov.success) setCoverage(cov.data);
      if (out.success) setOutcomes(out.data);
      if (abn.success) setAbnormalPatients(abn.data);
    }).finally(() => setLoading(false));
  }, [from, to, user?.posyanduId]);

  // Filter to only this posyandu's data
  const myCoverage = useMemo(() =>
    coverage.filter(d => d.unitId === user?.posyanduId),
    [coverage, user?.posyanduId],
  );

  const myOutcome = useMemo(() =>
    outcomes.filter(d => d.unitId === user?.posyanduId),
    [outcomes, user?.posyanduId],
  );

  const myAbnormal = useMemo(() =>
    abnormalPatients.filter(d => d.posyanduId === user?.posyanduId),
    [abnormalPatients, user?.posyanduId],
  );

  const trendData = useMemo(() =>
    myCoverage.map(d => ({
      name: formatYM(d.ym),
      partisipasi: Math.round(d.participation * 100),
    })),
    [myCoverage],
  );

  // Bulan terakhir yang punya data (outcomes tidak zero-fill, jadi harus dipilih eksplisit).
  const latestOutcome = useMemo(() => {
    const withData = myOutcome.filter((d) => d.total > 0).sort((a, b) => a.ym.localeCompare(b.ym));
    return withData.at(-1) ?? null;
  }, [myOutcome]);
  const latestMonth = latestOutcome?.ym ?? '';

  // Stacked bar per indikator: Tidak Normal / Normal (hanya yang sudah dinilai)
  const indicatorOutcomeStacked = useMemo(() => {
    if (!latestOutcome) return [];
    return INDICATORS.map((ind) => {
      const abnormal = latestOutcome.abnormalByIndicator[ind.key] ?? 0;
      const assessed = latestOutcome.assessedByIndicator?.[ind.key] ?? 0;
      return {
        key: ind.key,
        name: ind.label.length > 20 ? ind.label.slice(0, 18) + '…' : ind.label,
        fullLabel: ind.label,
        abnormal,
        normal: Math.max(0, assessed - abnormal),
      };
    }).filter((r) => r.abnormal + r.normal > 0);
  }, [latestOutcome]);

  const normalPct = useMemo(() => {
    if (!latestOutcome) return 0;
    const assessed = latestOutcome.normal + latestOutcome.abnormal;
    return assessed > 0 ? Math.round((latestOutcome.normal / assessed) * 100) : 0;
  }, [latestOutcome]);

  // Temuan abnormal pada bulan terpilih (samakan dengan donut/kartu lain).
  const latestAbnormal = useMemo(
    () => myAbnormal.filter((p) => p.ym === latestMonth),
    [myAbnormal, latestMonth],
  );
  const abnormalPatientCount = useMemo(
    () => new Set(latestAbnormal.map((p) => p.regNumber)).size,
    [latestAbnormal],
  );

  // Group abnormal patients by indicator
  const abnormalByIndicator = useMemo(() => {
    const map = new Map<string, AbnormalPatient[]>();
    for (const p of latestAbnormal) {
      if (!map.has(p.indicatorKey)) map.set(p.indicatorKey, []);
      map.get(p.indicatorKey)!.push(p);
    }
    return map;
  }, [latestAbnormal]);

  const activeDenominator = useMemo(() => {
    return myCoverage.find((d) => d.ym === latestMonth)?.denominator ?? 0;
  }, [myCoverage, latestMonth]);

  if (loading && myCoverage.length === 0) {
    return <AnalisisPageSkeleton />;
  }

  const hasAnyData = myCoverage.some((d) => d.numerator > 0);
  if (!hasAnyData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#111b21]">Analisis Posyandu</h2>
          <PeriodControl selected={period} onChange={setPeriod} />
        </div>
        <EmptyState title="Belum ada data pengukuran" description="Mulai catat pengukuran pasien untuk melihat statistik posyandu Anda." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-extrabold text-[#111b21]">Analisis Posyandu</h2>
        <PeriodControl selected={period} onChange={setPeriod} />
      </div>

      {/* LEVEL 1: RINGKASAN KPI, DEMOGRAFI & CAKUPAN PARTISIPASI (MAKRO) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center shadow-xs">
          <Users className="w-5 h-5 text-[#075e54] mx-auto mb-1" />
          <p className="text-lg font-extrabold text-[#111b21]">
            {activeDenominator.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-[#54656f] font-bold">Terdaftar</p>
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
        <ChartCard title="Tren Partisipasi Posyandu" subtitle="Persentase pasien terukur per bulan">
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

      {/* LEVEL 2: HASIL SKRINING & TEMUAN KLINIS UMUM */}
      {indicatorOutcomeStacked.length > 0 && (
        <ChartCard
          title="Distribusi Hasil Pengukuran per Indikator"
          subtitle={`Bulan ${formatYM(latestMonth)} — rasio hasil sehat & temuan klinis`}
        >
          <IndicatorOutcomeStackedBar data={indicatorOutcomeStacked} />
        </ChartCard>
      )}

      {/* LEVEL 3: PROGRAM PRIORITAS GIZI BALITA & KHUSUS (SPESIFIK) */}
      {/* 3a. Status gizi balita (Permenkes 2/2020) */}
      <GrowthStatusDistribution from={from} to={to} />

      {/* 3b. Tren stunting (TB/U) */}
      <StuntingTrendCard from={from} to={to} />

      {/* 3c. Progres berat badan (N/T & 2T) */}
      <WeightProgressionCard from={from} to={to} />

      {/* 3d. ASI Eksklusif & Skrining TB */}
      <BreastfeedingCard from={from} to={to} />
      <TbScreeningCard from={from} to={to} />

      {/* LEVEL 4: DETAIL MIKRO / PASIEN TIDAK NORMAL (ACTIONABLE) */}
      {latestAbnormal.length > 0 && (
        <ChartCard
          title="Pasien dengan Temuan Tidak Normal"
          subtitle={`${abnormalPatientCount} pasien · ${latestAbnormal.length} temuan · ${formatYM(latestMonth)}`}
        >
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {Array.from(abnormalByIndicator.entries()).map(([indKey, patients]) => {
              const ind = INDICATORS.find(i => i.key === indKey);
              return (
                <div key={indKey}>
                  <h4 className="text-xs font-extrabold text-[#54656f] mb-1.5 uppercase tracking-wide">
                    {ind?.label ?? indKey} ({patients.length})
                  </h4>
                  <div className="space-y-1">
                    {patients.slice(0, 10).map((p) => (
                      <div key={p.measurementId} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <PatientAvatar name={p.patientName} category={p.category} size={28} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#111b21] truncate">{p.patientName}</p>
                            <p className="text-[10px] text-[#8696a0]">{p.regNumber}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-extrabold text-red-600">
                            {p.value}{p.unit !== '-' ? ` ${p.unit}` : ''}
                          </p>
                          <p className="text-[10px] text-[#8696a0]">{p.category ?? '-'}</p>
                        </div>
                      </div>
                    ))}
                    {patients.length > 10 && (
                      <p className="text-[10px] text-[#8696a0] text-center">+ {patients.length - 10} lainnya</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}
    </div>
  );
}
