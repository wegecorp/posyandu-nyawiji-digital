'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { DrillSheet } from './DrillSheet';
import { PatientDrillList } from './PatientDrillList';

type UnitRow = {
  unitId: string;
  unitName: string;
  abnormal: number;
  assessed: number;
  prevalence: number;
  smallSample: boolean;
};

/**
 * Detail per-indikator: peringkat unit (puskesmas/posyandu) → daftar pasien.
 * Prevalensi = temuan / pasien yang diperiksa untuk indikator itu.
 */
export function IndicatorDrillSheet({
  indicator,
  label,
  from,
  to,
  scope,
  onClose,
}: {
  indicator: string;
  label: string;
  from: string;
  to: string;
  scope: 'puskesmas' | 'posyandu';
  onClose: () => void;
}) {
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ unitId: string; unitName: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/stats/indicator-units?indicator=${indicator}&from=${from}&to=${to}&scope=${scope}`)
      .then((r) => r.json())
      .then((d) => {
        if (active && d.success) setUnits(d.data ?? []);
      })
      .catch((e) => console.error('Gagal memuat peringkat unit:', e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [indicator, from, to, scope]);

  return (
    <DrillSheet
      title={selected ? selected.unitName : `Temuan: ${label}`}
      subtitle={selected ? label : scope === 'puskesmas' ? 'Peringkat per Puskesmas' : 'Peringkat per Posyandu'}
      onClose={onClose}
      onBack={selected ? () => setSelected(null) : undefined}
    >
      {selected ? (
        <PatientDrillList
          key={selected.unitId}
          baseUrl={`/api/stats/abnormal-patients?indicator=${indicator}&from=${from}&to=${to}&unitId=${selected.unitId}&unitLevel=${scope}`}
          emptyText="Tidak ada temuan pada unit ini."
        />
      ) : loading ? (
        <div className="py-10 flex flex-col items-center gap-2 text-xs font-bold text-[#54656f]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#128c7e]" />
          Memuat peringkat...
        </div>
      ) : units.length === 0 ? (
        <p className="py-10 text-center text-xs font-bold text-[#54656f]">
          Belum ada unit dengan data indikator ini pada periode terpilih.
        </p>
      ) : (
        <div className="space-y-2">
          {units.map((u) => (
            <button
              key={u.unitId}
              type="button"
              onClick={() => setSelected({ unitId: u.unitId, unitName: u.unitName })}
              className="w-full flex items-center justify-between gap-2 bg-white rounded-xl border border-[#e9edef] p-2.5 text-left hover:bg-[#f0f2f5] transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111b21] truncate">{u.unitName}</p>
                <p className="text-[10px] text-[#8696a0]">
                  {u.abnormal} temuan / {u.assessed} diperiksa
                  {u.smallSample && <span className="text-amber-600 font-bold"> · sampel kecil</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-extrabold text-[#111b21]">
                  {Math.round(u.prevalence * 100)}%
                </p>
                <p className="text-[10px] text-[#128c7e] font-bold">lihat ›</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </DrillSheet>
  );
}
