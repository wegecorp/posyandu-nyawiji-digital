'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';

export type DrillUnit = {
  unitId: string;
  unitName: string;
  count: number;
  total: number;
  percent: number;
  smallSample?: boolean;
};

/**
 * Daftar unit agregat (puskesmas/posyandu) untuk drill-down. Tanpa identitas pasien.
 * Tampil semua + pencarian (jumlah unit terbatas).
 */
export function UnitDrillList({
  baseUrl,
  onPick,
  emptyText = 'Tidak ada unit dengan data pada filter ini.',
  searchPlaceholder = 'Cari unit...',
  mapRaw,
}: {
  baseUrl: string;
  /** Bila kosong, baris bersifat statis (level terdalam drill). */
  onPick?: (u: DrillUnit) => void;
  emptyText?: string;
  searchPlaceholder?: string;
  /** Normalisasi payload API → DrillUnit (mis. ASI: exclusive/assessed). */
  mapRaw?: (raw: Record<string, unknown>) => DrillUnit;
}) {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [units, setUnits] = useState<DrillUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (q === debouncedQ) return;
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setLoading(true);
    }, 300);
    return () => clearTimeout(t);
  }, [q, debouncedQ]);

  useEffect(() => {
    let active = true;
    const sep = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${sep}${debouncedQ ? `q=${encodeURIComponent(debouncedQ)}` : ''}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (active && d.success) {
          const raw = (d.data ?? []) as Record<string, unknown>[];
          setUnits(mapRaw ? raw.map(mapRaw) : (raw as unknown as DrillUnit[]));
        }
      })
      .catch((e) => console.error('Gagal memuat unit:', e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [baseUrl, debouncedQ, mapRaw]);

  if (loading) {
    return (
      <div className="py-10 flex flex-col items-center gap-2 text-xs font-bold text-[#54656f]">
        <RefreshCw className="w-5 h-5 animate-spin text-[#128c7e]" />
        Memuat data...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 text-[#8696a0] absolute left-3 top-2.5" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-8 py-2 text-xs bg-white rounded-xl border border-[#e9edef] outline-none focus:border-[#128c7e] font-medium text-[#111b21] placeholder-[#8696a0]"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="absolute right-2 top-1.5 w-6 h-6 flex items-center justify-center text-[#54656f] hover:text-[#111b21]"
            title="Bersihkan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {units.length === 0 ? (
        <p className="py-10 text-center text-xs font-bold text-[#54656f]">{emptyText}</p>
      ) : (
        units.map((u) => {
          const raw = u as unknown as Record<string, unknown>;
          const count = Number(u.count ?? raw.abnormal ?? 0);
          const total = Number(u.total ?? raw.assessed ?? 0);
          const rawPct = u.percent ?? raw.prevalence;
          const percent =
            typeof rawPct === 'number' && Number.isFinite(rawPct)
              ? rawPct
              : total > 0
                ? count / total
                : 0;
          const displayPct = Number.isFinite(percent) ? Math.round(percent * 100) : 0;
          const body = (
            <>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111b21] truncate">{u.unitName}</p>
                <p className="text-[10px] text-[#8696a0]">
                  {count} / {total} dinilai
                  {u.smallSample && <span className="text-amber-600 font-bold"> · sampel kecil</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-extrabold text-[#111b21]">{displayPct}%</p>
                {onPick && <p className="text-[10px] text-[#128c7e] font-bold">lihat ›</p>}
              </div>
            </>
          );
          const rowCls =
            'w-full flex items-center justify-between gap-2 bg-white rounded-xl border border-[#e9edef] p-2.5 text-left transition-colors';
          return onPick ? (
            <button
              key={u.unitId}
              type="button"
              onClick={() => onPick(u)}
              className={`${rowCls} hover:bg-[#f0f2f5]`}
            >
              {body}
            </button>
          ) : (
            <div key={u.unitId} className={rowCls}>
              {body}
            </div>
          );
        })
      )}
    </div>
  );
}
