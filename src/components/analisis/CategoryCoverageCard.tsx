import React, { useEffect, useMemo, useState } from 'react';
import { ChartCard } from './ChartCard';
import { ChartCardSkeleton } from '@/components/Skeleton';
import { CATEGORY_ORDER } from '@/lib/coverage-analytics';
import { getCategoryBadge } from '@/lib/utils';
import { Users, Activity } from 'lucide-react';

type Row = {
  ym: string;
  category: string;
  registered: number;
  measured: number;
  totalRegistered?: number;
  totalMeasured?: number;
  percent?: number;
  sharePercent?: number;
};

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function CategoryCoverageCard({ from, to, hcId }: { from: string; to: string; hcId?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/stats/category-coverage?from=${from}&to=${to}${hcId ? `&hcId=${hcId}` : ''}`,
        );
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
  }, [from, to, hcId]);

  const latest = useMemo(() => {
    const ms = rows.filter((r) => r.measured > 0).map((r) => r.ym);
    return ms.sort().at(-1) ?? '';
  }, [rows]);

  const monthRows = useMemo(() => rows.filter((r) => r.ym === latest), [rows, latest]);

  const totalRegistered = useMemo(() => {
    if (monthRows[0]?.totalRegistered != null) return monthRows[0].totalRegistered;
    return monthRows.reduce((sum, r) => sum + r.registered, 0);
  }, [monthRows]);

  const totalMeasured = useMemo(() => {
    if (monthRows[0]?.totalMeasured != null) return monthRows[0].totalMeasured;
    return monthRows.reduce((sum, r) => sum + r.measured, 0);
  }, [monthRows]);

  const totalPercent = totalRegistered > 0 ? Math.round((totalMeasured / totalRegistered) * 100) : 0;

  if (loading && rows.length === 0) {
    return <ChartCardSkeleton height="h-44" />;
  }

  if (!latest) {
    return (
      <ChartCard title="Cakupan & Distribusi Pasien per Kategori" subtitle="Terukur / terdaftar per bulan">
        <p className="py-6 text-center text-xs font-bold text-[#54656f]">
          Belum ada data pengukuran pada periode ini.
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Cakupan & Distribusi Pasien per Kategori"
      subtitle={`Bulan ${formatYM(latest)} — terukur / terdaftar per kelompok sasaran`}
    >
      <div className="space-y-3">
        {/* Ringkasan Keseluruhan */}
        <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#f0f2f5] rounded-xl border border-[#e9edef] text-center">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-[#54656f] flex items-center justify-center gap-1">
              <Users className="w-3 h-3 text-[#128c7e]" />
              Total Terdaftar
            </span>
            <p className="text-base font-black text-[#111b21]">{totalRegistered.toLocaleString('id-ID')}</p>
          </div>
          <div className="space-y-0.5 border-l border-[#e9edef]">
            <span className="text-[10px] font-bold text-[#54656f] flex items-center justify-center gap-1">
              <Activity className="w-3 h-3 text-[#25d366]" />
              Terdata Bulan Ini
            </span>
            <p className="text-base font-black text-[#075e54]">
              {totalMeasured.toLocaleString('id-ID')}{' '}
              <span className="text-[11px] font-bold text-[#128c7e]">({totalPercent}%)</span>
            </p>
          </div>
        </div>

        {/* Breakdown per Kategori */}
        <div className="space-y-2.5 pt-1">
          {CATEGORY_ORDER.map((cat) => {
            const r = monthRows.find((x) => x.category === cat);
            const reg = r?.registered ?? 0;
            const meas = r?.measured ?? 0;
            const pct = r?.percent ?? (reg > 0 ? Math.round((meas / reg) * 100) : 0);
            const share = r?.sharePercent ?? (totalRegistered > 0 ? Math.round((reg / totalRegistered) * 100) : 0);
            const badge = getCategoryBadge(cat as never);

            return (
              <div key={cat} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[#111b21] truncate">{badge.label}</span>
                    <span className="text-[10px] font-medium text-[#54656f] shrink-0">
                      ({share}% populasi)
                    </span>
                  </div>
                  <span className="text-[#54656f] shrink-0 font-mono text-[11px]">
                    <strong className="text-[#111b21]">{meas.toLocaleString('id-ID')}</strong>/{reg.toLocaleString('id-ID')} ·{' '}
                    <strong className="text-[#075e54]">{pct}%</strong>
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#f0f2f5] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#128c7e] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}
