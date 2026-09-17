'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { GROWTH_CATEGORIES, type GrowthIndex } from '@/lib/growth';
import { ChartCard } from './ChartCard';
import { GrowthDrillSheet } from './GrowthDrillSheet';
import { type DrillUnit } from './UnitDrillList';
import { useBackLayer } from '@/lib/back-navigation';

const INDICATOR_OPTIONS: { key: GrowthIndex; label: string }[] = [
  { key: 'TB_U', label: 'Stunting (TB/U)' },
  { key: 'BB_U', label: 'Berat Badan Kurang (BB/U)' },
  { key: 'BB_TB', label: 'Gizi Kurang / Lebih (BB/TB)' },
  { key: 'IMT_U', label: 'Gizi Kurang / Lebih (IMT/U)' },
];

/**
 * Peringkat prevalensi masalah gizi per wilayah.
 * DINKES → per Puskesmas; PUSKESMAS → per Posyandu. Klik baris → drill.
 */
export function GrowthProblemRanking({
  from,
  to,
  hcId,
  hcName,
}: {
  from: string;
  to: string;
  hcId?: string;
  hcName?: string;
}) {
  const { user } = useAuth();
  const role = user?.role;
  const scope = role === 'DINKES' && !hcId ? 'puskesmas' : 'posyandu';
  const drillable = role === 'DINKES' || role === 'PUSKESMAS';

  const [indicator, setIndicator] = useState<GrowthIndex>('TB_U');
  const [units, setUnits] = useState<DrillUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<DrillUnit | null>(null);

  useBackLayer(Boolean(drill), () => setDrill(null));

  const option = INDICATOR_OPTIONS.find((o) => o.key === indicator) ?? INDICATOR_OPTIONS[0];
  const problemCats = useMemo(
    () => GROWTH_CATEGORIES[indicator].filter((c) => c.key !== 'normal'),
    [indicator],
  );
  const categoryKey = problemCats.map((c) => c.key).join(',');
  const categoryLabel = problemCats.map((c) => c.label).join(' / ');

  useEffect(() => {
    if (!drillable) return;
    let active = true;
    fetch(
      `/api/stats/growth-units?indicator=${indicator}&category=${encodeURIComponent(categoryKey)}&scope=${scope}&from=${from}&to=${to}${hcId ? `&hcId=${hcId}` : ''}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (active && d.success) setUnits(d.data ?? []);
      })
      .catch((e) => console.error('Gagal memuat peringkat masalah gizi:', e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [indicator, scope, categoryKey, from, to, drillable, hcId]);

  if (!drillable) return null;

  return (
    <>
      <ChartCard
        title="Peringkat Masalah Gizi"
        subtitle={scope === 'puskesmas' ? 'Per Puskesmas — klik untuk rincian' : 'Per Posyandu — klik untuk rincian'}
      >
        <div className="mb-3">
          <label className="block text-[10px] font-bold text-[#667781] uppercase tracking-wide mb-1">
            Indikator
          </label>
          <select
            value={indicator}
            onChange={(e) => {
              setLoading(true);
              setIndicator(e.target.value as GrowthIndex);
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
          <div className="py-8 flex flex-col items-center gap-2 text-xs font-bold text-[#54656f]">
            <RefreshCw className="w-5 h-5 animate-spin text-[#128c7e]" />
            Memuat data...
          </div>
        ) : units.length === 0 ? (
          <p className="py-8 text-center text-xs font-bold text-[#54656f]">
            Belum ada kasus pada periode ini.
          </p>
        ) : (
          <div className="space-y-1.5">
            {units.slice(0, 10).map((u, idx) => {
              const pct = Math.round(u.percent * 100);
              return (
                <button
                  key={u.unitId}
                  type="button"
                  onClick={() => setDrill(u)}
                  className="w-full flex items-center justify-between gap-2 bg-white rounded-xl border border-[#e9edef] p-2.5 text-left hover:bg-[#f0f2f5] transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-[#111b21] truncate">
                      <span className="text-[#8696a0] font-extrabold mr-1">{idx + 1}.</span>
                      {u.unitName}
                    </span>
                    <span className="block text-[10px] text-[#8696a0]">
                      {u.count} / {u.total} balita
                      {u.smallSample && <span className="text-amber-600 font-bold"> · sampel kecil</span>}
                    </span>
                  </span>
                  <span className="text-sm font-extrabold text-[#b45309] shrink-0">
                    {pct}% <span className="text-[#128c7e]">›</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </ChartCard>

      {drill && (
        <GrowthDrillSheet
          key={`${indicator}-${drill.unitId}`}
          indicator={indicator}
          categoryKey={categoryKey}
          categoryLabel={categoryLabel}
          indicatorLabel={option.label}
          from={from}
          to={to}
          initialHc={
            role === 'DINKES'
              ? hcId
                ? { unitId: hcId, unitName: hcName ?? '', count: 0, total: 0, percent: 0 }
                : drill
              : undefined
          }
          initialPosyandu={role === 'PUSKESMAS' ? drill : undefined}
          onClose={() => setDrill(null)}
        />
      )}
    </>
  );
}
