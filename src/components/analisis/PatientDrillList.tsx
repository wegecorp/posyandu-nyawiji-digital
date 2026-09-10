'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, User } from 'lucide-react';

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
 */
export function PatientDrillList({
  baseUrl,
  pageSize = 20,
  emptyText = 'Tidak ada data pada filter ini.',
}: {
  baseUrl: string;
  pageSize?: number;
  emptyText?: string;
}) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DrillPatient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const sep = baseUrl.includes('?') ? '&' : '?';
    fetch(`${baseUrl}${sep}page=${page}&pageSize=${pageSize}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active || !d.success) return;
        setItems(d.data ?? []);
        setTotal(typeof d.total === 'number' ? d.total : (d.data?.length ?? 0));
      })
      .catch((e) => console.error('Gagal memuat detail:', e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [baseUrl, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const go = (n: number) => {
    setLoading(true);
    setPage(n);
  };

  if (loading) {
    return (
      <div className="py-10 flex flex-col items-center gap-2 text-xs font-bold text-[#54656f]">
        <RefreshCw className="w-5 h-5 animate-spin text-[#128c7e]" />
        Memuat data...
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="py-10 text-center text-xs font-bold text-[#54656f]">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={() => go(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 bg-white text-[#128c7e] border border-[#e9edef] rounded-full text-[11px] font-bold disabled:opacity-40"
          >
            ‹ Sebelumnya
          </button>
          <span className="text-[10px] font-bold text-[#54656f]">
            {page}/{totalPages} · {total} data
          </span>
          <button
            onClick={() => go(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 bg-white text-[#128c7e] border border-[#e9edef] rounded-full text-[11px] font-bold disabled:opacity-40"
          >
            Berikutnya ›
          </button>
        </div>
      )}
    </div>
  );
}
