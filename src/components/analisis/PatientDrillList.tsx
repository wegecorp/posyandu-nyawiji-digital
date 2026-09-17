'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, User, X } from 'lucide-react';

export type DrillPatient = {
  patientName: string;
  regNumber: string;
  meta?: string;
  value?: string | number;
  unit?: string;
  note?: string;
};

/**
 * Daftar pasien untuk drill-down. Fetch dari endpoint stats yang sudah
 * dinormalisasi ke bentuk { success, data: DrillPatient[], total }.
 * Gaya daftar: "Muat lebih banyak" (append) + pencarian server-side.
 */
export function PatientDrillList({
  baseUrl,
  pageSize = 20,
  emptyText = 'Tidak ada data pada filter ini.',
  searchPlaceholder = 'Cari nama / no. registrasi...',
}: {
  baseUrl: string;
  pageSize?: number;
  emptyText?: string;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DrillPatient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce pencarian; reset daftar saat query berubah.
  useEffect(() => {
    if (q === debouncedQ) return;
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
      setItems([]);
      setError(null);
      setLoading(true);
    }, 300);
    return () => clearTimeout(t);
  }, [q, debouncedQ]);

  useEffect(() => {
    let active = true;
    const sep = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${sep}page=${page}&pageSize=${pageSize}${
      debouncedQ ? `&q=${encodeURIComponent(debouncedQ)}` : ''
    }`;
    fetch(url)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d.success) {
          throw new Error(typeof d?.error === 'string' ? d.error : 'Gagal memuat data.');
        }
        return d;
      })
      .then((d) => {
        if (!active) return;
        setError(null);
        setTotal(typeof d.total === 'number' ? d.total : (d.data?.length ?? 0));
        setItems((prev) => (page === 1 ? (d.data ?? []) : [...prev, ...(d.data ?? [])]));
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (page === 1) setError(e instanceof Error ? e.message : 'Gagal memuat data.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setLoadingMore(false);
      });
    return () => {
      active = false;
    };
  }, [baseUrl, debouncedQ, page, pageSize]);

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

      {loading ? (
        <div className="py-10 flex flex-col items-center gap-2 text-xs font-bold text-[#54656f]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#128c7e]" />
          Memuat data...
        </div>
      ) : error ? (
        <p className="py-10 text-center text-xs font-bold text-[#ef4444]">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-xs font-bold text-[#54656f]">{emptyText}</p>
      ) : (
        <>
          {items.map((p, i) => (
            <div
              key={`${p.regNumber}-${i}`}
              className="flex items-center justify-between gap-2 bg-white rounded-xl border border-[#e9edef] p-2.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-[#128c7e] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#111b21] truncate">{p.patientName}</p>
                  <p className="text-[10px] text-[#8696a0] truncate">
                    {p.regNumber}
                    {p.meta ? ` · ${p.meta}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                {p.value != null && p.value !== '' && (
                  <p className="text-xs font-extrabold text-[#111b21]">
                    {p.value}
                    {p.unit && p.unit !== '-' && p.value !== '-' ? ` ${p.unit}` : ''}
                  </p>
                )}
                {p.note && <p className="text-[10px] text-[#8696a0]">{p.note}</p>}
              </div>
            </div>
          ))}

          {items.length < total && (
            <button
              onClick={() => {
                setLoadingMore(true);
                setPage((p) => p + 1);
              }}
              disabled={loadingMore}
              className="w-full py-2.5 bg-white hover:bg-[#f0f2f5] text-[#128c7e] border border-[#e9edef] rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Memuat...' : `Muat lebih banyak (${total - items.length} lagi)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
