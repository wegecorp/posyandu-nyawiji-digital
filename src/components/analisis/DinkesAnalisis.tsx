'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Users, AlertTriangle, Building2, ChevronRight, ArrowLeft } from 'lucide-react';
import { ChartCard } from './ChartCard';
import { GrowthStatusDistribution } from './GrowthStatusDistribution';
import { GrowthProblemRanking } from './GrowthProblemRanking';
import { StuntingTrendCard } from './StuntingTrendCard';
import { WeightProgressionCard } from './WeightProgressionCard';
import { BreastfeedingCard } from './BreastfeedingCard';
import { CategoryCoverageCard } from './CategoryCoverageCard';
import { TbScreeningCard } from './TbScreeningCard';
import { IndicatorOutcomeStackedBar } from './IndicatorOutcomeStackedBar';
import { IndicatorDrillSheet } from './IndicatorDrillSheet';
import { PeriodControl, periodToRange } from './PeriodControl';
import { UnitScoreboard } from './UnitScoreboard';
import { EmptyState } from './EmptyState';
import { INDICATORS } from '@/lib/clinical';
import { PARTISIPASI_BURUK_THRESHOLD } from '@/lib/clinical';
import { useBackLayer } from '@/lib/back-navigation';
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
  assessedByIndicator: Record<string, number>;
  eligibleByIndicator: Record<string, number>;
};

const INDICATOR_COLORS: Record<string, string> = {
  hypertension: '#ef4444',
  anemia: '#f97316',
  highBloodSugar: '#eab308',
  highCholesterol: '#a855f7',
  highUricAcid: '#3b82f6',
  abnormalVision: '#ec4899',
  abnormalHearing: '#14b8a6',
};

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function DinkesAnalisis() {
  const [period, setPeriod] = useState('12m');
  const [coverageData, setCoverageData] = useState<CoverageData[]>([]);
  const [outcomeData, setOutcomeData] = useState<OutcomeData[]>([]);
  const [drillHcId, setDrillHcId] = useState<string | null>(null);
  const [drillHcName, setDrillHcName] = useState<string>('');
  const [drill, setDrill] = useState<{ key: string; coverage: CoverageData[]; outcomes: OutcomeData[] }>({
    key: '',
    coverage: [],
    outcomes: [],
  });
  const [loading, setLoading] = useState(true);
  const [indicatorDrill, setIndicatorDrill] = useState<{ key: string; label: string } | null>(null);

  useBackLayer(Boolean(drillHcId), () => setDrillHcId(null));
  useBackLayer(Boolean(indicatorDrill), () => setIndicatorDrill(null));

  const { from, to } = useMemo(() => periodToRange(period), [period]);

  // Fetch kabupaten-level data
  useEffect(() => {
    Promise.all([
      fetch(`/api/stats/coverage?scope=kabupaten&from=${from}&to=${to}`).then(r => r.json()),
      fetch(`/api/stats/outcomes?scope=kabupaten&from=${from}&to=${to}`).then(r => r.json()),
    ]).then(([cov, out]) => {
      if (cov.success) setCoverageData(cov.data);
      if (out.success) setOutcomeData(out.data);
    }).finally(() => setLoading(false));
  }, [from, to]);

  // Fetch puskesmas ranking (coverage)
  const [puskesmasCoverage, setPuskesmasCoverage] = useState<CoverageData[]>([]);
  useEffect(() => {
    fetch(`/api/stats/coverage?scope=puskesmas&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { if (d.success) setPuskesmasCoverage(d.data); });
  }, [from, to]);

  // Drill into puskesmas → posyandu
  const handleDrill = useCallback((hcId: string, hcName: string) => {
    setDrillHcId(hcId);
    setDrillHcName(hcName);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  // Refetch data drill saat HC atau periode berubah (agar tidak basi setelah ganti periode).
  // Data disimpan bersama key periode sehingga hasil lama tidak ditampilkan sebagai milik HC baru.
  const drillKey = drillHcId ? `${drillHcId}|${from}|${to}` : '';
  const drillCoverage = useMemo(
    () => (drill.key === drillKey ? drill.coverage : []),
    [drill, drillKey],
  );
  const drillOutcomeData = useMemo(
    () => (drill.key === drillKey ? drill.outcomes : []),
    [drill, drillKey],
  );
  const drillLoading = Boolean(drillHcId) && drill.key !== drillKey;

  useEffect(() => {
    if (!drillHcId) return;
    let active = true;
    const key = `${drillHcId}|${from}|${to}`;
    Promise.all([
      fetch(`/api/stats/coverage?scope=posyandu&hcId=${drillHcId}&from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/stats/outcomes?scope=kabupaten&hcId=${drillHcId}&from=${from}&to=${to}`).then((r) => r.json()),
    ])
      .then(([cov, out]) => {
        if (!active) return;
        setDrill({
          key,
          coverage: cov.success ? cov.data : [],
          outcomes: out.success ? out.data : [],
        });
      })
      .catch((e) => console.error('Gagal memuat data drill puskesmas:', e));
    return () => {
      active = false;
    };
  }, [drillHcId, from, to]);

  // Bulan terakhir yang benar-benar punya data ukur (bukan bulan berjalan kosong).
  const latestMonth = useMemo(() => {
    const withData = coverageData.filter((d) => d.numerator > 0).map((d) => d.ym);
    return withData.sort().at(-1) ?? '';
  }, [coverageData]);

  // Bulan terakhir HC yang sedang di-drill — dari data HC, bukan kabupaten.
  const drillLatestMonth = useMemo(() => {
    const withData = drillCoverage.filter((d) => d.numerator > 0).map((d) => d.ym);
    return withData.sort().at(-1) ?? '';
  }, [drillCoverage]);

  // Trend line: agregat kabupaten, atau agregat HC saat di-drill.
  const trendData = useMemo(() => {
    if (!drillHcId) {
      return coverageData.map(d => ({ name: formatYM(d.ym), partisipasi: Math.round(d.participation * 100), terukur: d.numerator, terdaftar: d.denominator }));
    }
    const byMonth = new Map<string, { numerator: number; denominator: number }>();
    for (const d of drillCoverage) {
      const cur = byMonth.get(d.ym) ?? { numerator: 0, denominator: 0 };
      cur.numerator += d.numerator;
      cur.denominator += d.denominator;
      byMonth.set(d.ym, cur);
    }
    return [...byMonth.entries()]
      .filter(([, v]) => v.denominator > 0 || v.numerator > 0)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, v]) => ({
        name: formatYM(ym),
        partisipasi: v.denominator > 0 ? Math.round((v.numerator / v.denominator) * 100) : 0,
        terukur: v.numerator,
        terdaftar: v.denominator,
      }));
  }, [drillHcId, drillCoverage, coverageData]);

  // Puskesmas scoreboard: agregat SELURUH periode terpilih (Σ terukur / Σ sasaran),
  // supaya peringkat objektif lintas unit.
  const puskesmasScoreboard = useMemo(() => {
    const agg = new Map<string, { unitId: string; unitName: string; numerator: number; denominator: number }>();
    for (const d of puskesmasCoverage) {
      const cur = agg.get(d.unitId) ?? { unitId: d.unitId, unitName: d.unitName, numerator: 0, denominator: 0 };
      cur.numerator += d.numerator;
      cur.denominator += d.denominator;
      cur.unitName = d.unitName;
      agg.set(d.unitId, cur);
    }
    return [...agg.values()].map((d) => ({
      unitId: d.unitId,
      unitName: d.unitName,
      participation: d.denominator > 0 ? d.numerator / d.denominator : 0,
      numerator: d.numerator,
      denominator: d.denominator,
    }));
  }, [puskesmasCoverage]);

  // Outcomes bulan terakhir: kabupaten, atau agregat HC saat di-drill.
  const activeOutcome = drillHcId
    ? drillOutcomeData.find(d => d.ym === drillLatestMonth)
    : outcomeData.find(d => d.ym === latestMonth);
  // Persentase "Normal" dihitung dari yang benar-benar dinilai (belum dinilai dipisah).
  const normalPct = useMemo(() => {
    if (!activeOutcome) return 0;
    const assessed = activeOutcome.normal + activeOutcome.abnormal;
    return assessed > 0 ? Math.round((activeOutcome.normal / assessed) * 100) : 0;
  }, [activeOutcome]);
  // Stacked bar per indikator: Tidak Normal / Normal (hanya yang sudah dinilai).
  const indicatorOutcomeStacked = useMemo(() => {
    if (!activeOutcome) return [];
    return INDICATORS.map((ind) => {
      const abnormal = activeOutcome.abnormalByIndicator[ind.key] ?? 0;
      const assessed = activeOutcome.assessedByIndicator?.[ind.key] ?? 0;
      return {
        key: ind.key,
        name: ind.label.length > 20 ? ind.label.slice(0, 18) + '…' : ind.label,
        fullLabel: ind.label,
        abnormal,
        normal: Math.max(0, assessed - abnormal),
      };
    }).filter((r) => r.abnormal + r.normal > 0);
  }, [activeOutcome]);

  // Abnormal by indicator (bulan terakhir, sesuai scope aktif)
  const abnormalByIndicator = useMemo(() => {
    if (!activeOutcome) return [];
    return INDICATORS
      .filter(ind => (activeOutcome.abnormalByIndicator[ind.key] ?? 0) > 0)
      .map(ind => ({
        key: ind.key,
        name: ind.label.length > 20 ? ind.label.slice(0, 18) + '…' : ind.label,
        jumlah: activeOutcome.abnormalByIndicator[ind.key] ?? 0,
        fill: INDICATOR_COLORS[ind.key] ?? '#8884d8',
      }));
  }, [activeOutcome]);

  // Total sasaran terdaftar pada bulan aktif (kabupaten atau HC).
  const activeDenominator = useMemo(() => {
    if (drillHcId) {
      return drillCoverage
        .filter(d => d.ym === drillLatestMonth)
        .reduce((sum, d) => sum + d.denominator, 0);
    }
    return coverageData.find((d) => d.ym === latestMonth)?.denominator ?? 0;
  }, [drillHcId, drillCoverage, drillLatestMonth, coverageData, latestMonth]);

  // Drill scoreboard (posyandu within puskesmas) — agregat seluruh periode drill.
  const drillScoreboard = useMemo(() => {
    const agg = new Map<string, { unitId: string; unitName: string; numerator: number; denominator: number }>();
    for (const d of drillCoverage) {
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
  }, [drillCoverage]);

  // Bulan aktif untuk kartu hasil pengukuran (kabupaten atau HC).
  const activeMonth = drillHcId ? drillLatestMonth : latestMonth;

  if (loading && coverageData.length === 0) {
    return <AnalisisPageSkeleton />;
  }

  const hasAnyData = coverageData.some((d) => d.numerator > 0);
  if (!hasAnyData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#111b21]">Analisis Kabupaten</h2>
          <PeriodControl selected={period} onChange={setPeriod} />
        </div>
        <EmptyState
          title="Belum ada data pengukuran"
          description="Mulai catat pengukuran pasien di Posyandu untuk melihat statistik di sini."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Range Filter */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-extrabold text-[#111b21]">
            {drillHcId ? drillHcName : 'Analisis Kabupaten'}
          </h2>
          <p className="text-xs text-[#54656f]">
            {drillHcId
              ? `Statistik agregat & rincian posyandu di wilayah ${drillHcName}`
              : 'Statistik agregat pelayanan posyandu se-Kabupaten Gunungkidul'}
          </p>
        </div>
        <PeriodControl selected={period} onChange={setPeriod} />
      </div>

      {/* Drilldown Context Bar (Lagi Buka Apa) */}
      {drillHcId && (
        <div className="bg-[#e7fceb] border border-[#25d366]/40 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#075e54] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Building2 className="w-4 h-4 text-[#25d366]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#075e54] flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setDrillHcId(null);
                    setDrillHcName('');
                    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
                  }}
                  className="hover:underline flex items-center gap-1 text-[#075e54]"
                >
                  Kabupaten Gunungkidul
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-[#128c7e] shrink-0" />
                <span className="font-extrabold text-[#111b21] bg-white px-2 py-0.5 rounded-lg border border-[#bbf7d0]">
                  {drillHcName}
                </span>
              </div>
              <p className="text-[11px] text-[#54656f] mt-0.5 truncate">
                Mode drill-down: Hanya menampilkan data sasaran & posyandu di {drillHcName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDrillHcId(null);
              setDrillHcName('');
              if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#075e54] text-[#075e54] hover:text-white border border-[#25d366]/50 rounded-xl text-xs font-bold transition-all shrink-0 touch-press shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kembali ke Kabupaten</span>
            <span className="sm:hidden">Kembali</span>
          </button>
        </div>
      )}

      {/* LEVEL 1: RINGKASAN KPI, DEMOGRAFI & CAKUPAN PARTISIPASI (MAKRO) */}
      {!(drillHcId && activeMonth === '') && (
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
              {(activeOutcome?.abnormal ?? 0).toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-[#54656f] font-bold">Perlu Perhatian</p>
          </div>
        </div>
      )}

      {/* 1a. Cakupan & Distribusi Kelompok Sasaran (Lansia s/d Bayi) */}
      <CategoryCoverageCard from={from} to={to} hcId={drillHcId ?? undefined} />

      {/* 1b. Tren Garis Partisipasi Bulanan */}
      {trendData.length > 0 && (
        <ChartCard
          title={drillHcId ? `Tren Partisipasi ${drillHcName}` : 'Tren Partisipasi Kabupaten'}
          subtitle={`${trendData[0]?.terukur ?? 0}–${trendData[trendData.length - 1]?.terukur ?? 0} pasien terukur/bulan`}
        >
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

      {/* 1c. Ranking Kinerja & Partisipasi Wilayah */}
      {!drillHcId && puskesmasScoreboard.length > 0 && (
        <ChartCard
          title="Ranking Kinerja & Partisipasi Puskesmas"
          subtitle={`Agregat ${formatYM(from.slice(0, 7))}–${formatYM(to.slice(0, 7))} — evaluasi komposit keaktifan entri & kelengkapan sasaran`}
        >
          <UnitScoreboard
            data={puskesmasScoreboard}
            onDrill={handleDrill}
          />
        </ChartCard>
      )}

      {/* Drill: Posyandu dalam Puskesmas */}
      {drillHcId && drillLoading && (
        <ChartCard title="Ranking Kinerja Posyandu" subtitle={drillHcName}>
          <p className="py-6 text-center text-xs font-bold text-[#54656f]">Memuat data...</p>
        </ChartCard>
      )}

      {drillHcId && !drillLoading && drillLatestMonth === '' && (
        <ChartCard title="Ranking Kinerja Posyandu" subtitle={drillHcName}>
          <p className="py-6 text-center text-xs font-bold text-[#54656f]">
            Belum ada data pengukuran untuk {drillHcName} pada periode ini.
          </p>
        </ChartCard>
      )}

      {drillHcId && !drillLoading && drillScoreboard.length > 0 && (
        <ChartCard
          title="Ranking Kinerja Posyandu"
          subtitle={`${drillHcName} — agregat ${formatYM(from.slice(0, 7))}–${formatYM(to.slice(0, 7))}`}
        >
          <UnitScoreboard data={drillScoreboard} />
        </ChartCard>
      )}

      {/* LEVEL 2: HASIL SKRINING & TEMUAN KLINIS UMUM */}
      {indicatorOutcomeStacked.length > 0 && (
        <ChartCard
          title="Distribusi Hasil Pengukuran per Indikator"
          subtitle={`Bulan ${formatYM(activeMonth)} — klik indikator untuk melihat rincian sebaran per wilayah`}
        >
          <IndicatorOutcomeStackedBar
            data={indicatorOutcomeStacked}
            onPick={(key, label) => setIndicatorDrill({ key, label })}
          />
        </ChartCard>
      )}

      {/* LEVEL 3: PROGRAM PRIORITAS GIZI BALITA & KHUSUS (SPESIFIK) */}
      {/* 3a. Status gizi balita (Permenkes 2/2020) */}
      <GrowthStatusDistribution from={from} to={to} hcId={drillHcId ?? undefined} />

      {/* 3b. Peringkat prevalensi masalah gizi per wilayah */}
      <GrowthProblemRanking from={from} to={to} hcId={drillHcId ?? undefined} hcName={drillHcName} />

      {/* 3c. Tren stunting (TB/U) */}
      <StuntingTrendCard from={from} to={to} hcId={drillHcId ?? undefined} />

      {/* 3d. Progres berat badan (N/T & 2T) */}
      <WeightProgressionCard from={from} to={to} hcId={drillHcId ?? undefined} />

      {/* 3e. ASI Eksklusif & Skrining TB */}
      <BreastfeedingCard from={from} to={to} hcId={drillHcId ?? undefined} hcName={drillHcName} />
      <TbScreeningCard from={from} to={to} hcId={drillHcId ?? undefined} />

      {indicatorDrill && (
        <IndicatorDrillSheet
          indicator={indicatorDrill.key}
          label={indicatorDrill.label}
          month={activeMonth}
          hcId={drillHcId ?? undefined}
          hcName={drillHcName}
          onClose={() => setIndicatorDrill(null)}
        />
      )}
    </div>
  );
}
