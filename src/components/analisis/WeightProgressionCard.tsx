'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ChartCard } from './ChartCard';
import { ChartCardSkeleton } from '@/components/Skeleton';
import { DrillSheet } from './DrillSheet';
import { PatientDrillList } from './PatientDrillList';
import { useBackLayer } from '@/lib/back-navigation';

type ProgressionRow = {
  ym: string;
  posyanduId: string;
  posyanduName: string;
  healthCenterId: string | null;
  healthCenterName: string | null;
  total: number;
  naik: number;
  tidakNaik: number;
  duaT: number;
  belumDinilai: number;
};

type Coverage = { month: string; balitaTotal: number; balitaMeasured: number };

type FalteringPatient = {
  measurementId: string;
  patientName: string;
  regNumber: string;
  sessionDate: string;
  weight: number | null;
  weightGain: number | null;
  ageInMonths: number;
  posyanduId: string;
  posyanduName: string;
  kalurahan: string;
  ym: string;
};

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function WeightProgressionCard({ from, to, hcId }: { from: string; to: string; hcId?: string }) {
  const { user } = useAuth();
  const canDrill = user?.role === 'PUSKESMAS' || user?.role === 'POSYANDU';
  const [rows, setRows] = useState<ProgressionRow[]>([]);
  const [faltering, setFaltering] = useState<FalteringPatient[]>([]);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<{ posyanduId?: string; title: string } | null>(null);

  useBackLayer(Boolean(drill), () => setDrill(null));

  useEffect(() => {
    let active = true;
    fetch(`/api/stats/weight-progression?from=${from}&to=${to}${hcId ? `&hcId=${hcId}` : ''}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active || !d.success) return;
        setRows(d.data ?? []);
        setFaltering(d.faltering ?? []);
        setCoverage(d.coverage ?? null);
      })
      .catch((e) => console.error('Gagal memuat progres berat:', e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [from, to, hcId]);

  const latestMonth = useMemo(() => {
    const months = rows.filter((r) => r.total > 0).map((r) => r.ym);
    return months.sort().at(-1) ?? '';
  }, [rows]);

  const totals = useMemo(() => {
    const monthRows = rows.filter((r) => r.ym === latestMonth);
    return monthRows.reduce(
      (acc, r) => ({
        naik: acc.naik + r.naik,
        tidakNaik: acc.tidakNaik + r.tidakNaik,
        duaT: acc.duaT + r.duaT,
        belumDinilai: acc.belumDinilai + r.belumDinilai,
      }),
      { naik: 0, tidakNaik: 0, duaT: 0, belumDinilai: 0 },
    );
  }, [rows, latestMonth]);

  const assessed = totals.naik + totals.tidakNaik;
  const notGainPct = assessed > 0 ? Math.round((totals.tidakNaik / assessed) * 100) : 0;

  // Unit dengan temuan 2T/tidak naik pada bulan terakhir.
  const unitRows = useMemo(() => {
    return rows
      .filter((r) => r.ym === latestMonth && r.total > 0 && (r.duaT > 0 || r.tidakNaik > 0))
      .sort((a, b) => b.duaT - a.duaT || b.tidakNaik - a.tidakNaik)
      .slice(0, 10);
  }, [rows, latestMonth]);

  if (loading) {
    return <ChartCardSkeleton height="h-48" />;
  }

  if (!latestMonth) {
    return (
      <ChartCard title="Progres Berat Badan (N/T)" subtitle="KMS — Naik / Tidak Naik">
        <p className="py-6 text-center text-xs font-bold text-[#54656f]">
          Belum ada data berat badan berpasangan pada periode ini.
        </p>
      </ChartCard>
    );
  }

  return (
    <>
      <ChartCard
        title="Progres Berat Badan (N/T)"
        subtitle={`Bulan ${formatYM(latestMonth)} — dibanding pengukuran sebelumnya`}
      >
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center">
            <TrendingUp className="w-5 h-5 text-[#075e54] mx-auto mb-1" />
            <p className="text-lg font-extrabold text-[#111b21]">{totals.naik}</p>
            <p className="text-[10px] text-[#54656f] font-bold">Naik (N)</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center">
            <TrendingDown className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-extrabold text-amber-600">{totals.tidakNaik}</p>
            <p className="text-[10px] text-[#54656f] font-bold">Tidak Naik ({notGainPct}%)</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-extrabold text-red-600">{totals.duaT}</p>
            <p className="text-[10px] text-[#54656f] font-bold">2T — rujuk</p>
          </div>
        </div>

        {coverage && coverage.balitaTotal > 0 && (
          <div className="mb-3 flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[#e9edef] bg-[#f0f2f5]">
            <span className="text-[11px] font-bold text-[#54656f]">
              Cakupan penimbangan bulan ini (balita)
            </span>
            <span className="text-xs font-extrabold text-[#075e54] shrink-0">
              {coverage.balitaMeasured}/{coverage.balitaTotal}
              {` (${Math.round((coverage.balitaMeasured / coverage.balitaTotal) * 100)}%)`}
            </span>
          </div>
        )}

        {unitRows.length > 0 && (
          <div className="space-y-1.5">
            {unitRows.map((r) => {
              const rowCls = `w-full flex items-center justify-between p-2 rounded-xl border text-left transition-colors ${
                r.duaT > 0 ? 'border-red-200 bg-red-50/50' : 'border-[#e9edef] bg-white'
              }`;
              const body = (
                <>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-[#111b21] truncate">{r.posyanduName}</span>
                    {r.healthCenterName && (
                      <span className="block text-[10px] text-[#8696a0] truncate">{r.healthCenterName}</span>
                    )}
                  </span>
                  <span className="text-[11px] font-bold text-[#54656f] shrink-0">
                    {r.tidakNaik} tidak naik
                    {r.duaT > 0 && <span className="text-red-600"> · {r.duaT} 2T</span>}
                    {canDrill && <span className="text-[#128c7e]"> ›</span>}
                  </span>
                </>
              );
              return canDrill ? (
                <button
                  key={r.posyanduId}
                  type="button"
                  onClick={() => setDrill({ posyanduId: r.posyanduId, title: r.posyanduName })}
                  className={`${rowCls} hover:bg-[#f0f2f5]`}
                >
                  {body}
                </button>
              ) : (
                <div key={r.posyanduId} className={rowCls}>
                  {body}
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>

      {faltering.length > 0 && (
        <ChartCard title="Perlu Rujuk (2T)" subtitle={`${faltering.length} anak — 2x tidak naik berturut-turut`}>
          <div className="space-y-1 max-h-[320px] overflow-y-auto">
            {faltering.slice(0, 20).map((p) => (
              <div
                key={p.measurementId}
                className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Users className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#111b21] truncate">{p.patientName}</p>
                    <p className="text-[10px] text-[#8696a0]">
                      {p.regNumber} · {p.posyanduName}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-extrabold text-red-600">
                    {p.weight != null ? `${p.weight} kg` : '-'}
                  </p>
                  <p className="text-[10px] text-[#8696a0]">{formatYM(p.ym)}</p>
                </div>
              </div>
            ))}
            {faltering.length > 0 && (
              <button
                type="button"
                onClick={() => setDrill({ title: 'Semua 2T — perlu rujuk' })}
                className="w-full py-2 bg-white hover:bg-[#f0f2f5] text-[#128c7e] border border-[#e9edef] rounded-lg text-[11px] font-bold transition-colors"
              >
                Lihat semua ({faltering.length}) ›
              </button>
            )}
          </div>
        </ChartCard>
      )}

      {drill && canDrill && (
        <DrillSheet
          title={drill.title}
          subtitle="Pasien 2T (2x tidak naik) — perlu rujuk"
          onClose={() => setDrill(null)}
        >
          <PatientDrillList
            key={drill.posyanduId ?? 'all'}
            baseUrl={`/api/stats/faltering-patients?from=${from}&to=${to}${
              drill.posyanduId ? `&posyanduId=${drill.posyanduId}` : ''
            }`}
            emptyText="Tidak ada pasien 2T pada filter ini."
          />
        </DrillSheet>
      )}
    </>
  );
}
