import React, { useEffect, useMemo, useState } from 'react';
import { ChartCard } from './ChartCard';
import { CATEGORY_ORDER } from '@/lib/coverage-analytics';
import { getCategoryBadge } from '@/lib/utils';

type Row = { ym: string; category: string; registered: number; measured: number };

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function CategoryCoverageCard({ from, to }: { from: string; to: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats/category-coverage?from=${from}&to=${to}`);
        const d = await res.json();
        if (active && d.success) setRows(d.data ?? []);
      } catch (e) {
        console.error('Gagal memuat cakupan per kelompok:', e);
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [from, to]);

  const latest = useMemo(() => {
    const ms = rows.filter((r) => r.measured > 0).map((r) => r.ym);
    return ms.sort().at(-1) ?? '';
  }, [rows]);

  const monthRows = useMemo(() => rows.filter((r) => r.ym === latest), [rows, latest]);

  if (loading && rows.length === 0) {
    return (
      <ChartCard title="Cakupan per Kelompok Sasaran">
        <p className="py-6 text-center text-xs font-bold text-[#54656f]">Memuat data...</p>
      </ChartCard>
    );
  }

  if (!latest) {
    return (
      <ChartCard title="Cakupan per Kelompok Sasaran" subtitle="Terukur / terdaftar per bulan">
        <p className="py-6 text-center text-xs font-bold text-[#54656f]">
          Belum ada data pengukuran pada periode ini.
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Cakupan per Kelompok Sasaran" subtitle={`Bulan ${formatYM(latest)} — terukur / terdaftar`}>
      <div className="space-y-2">
        {CATEGORY_ORDER.map((cat) => {
          const r = monthRows.find((x) => x.category === cat);
          const reg = r?.registered ?? 0;
          const meas = r?.measured ?? 0;
          const pct = reg > 0 ? Math.round((meas / reg) * 100) : 0;
          return (
            <div key={cat} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-[#111b21] truncate">{getCategoryBadge(cat as never).label}</span>
                <span className="text-[#54656f] shrink-0">
                  {meas}/{reg} · <strong className="text-[#075e54]">{pct}%</strong>
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#f0f2f5] rounded-full overflow-hidden">
                <div className="h-full bg-[#128c7e] rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
