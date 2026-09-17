import React, { useEffect, useMemo, useState } from 'react';
import { Baby } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ChartCard } from './ChartCard';
import { BreastfeedingDrillSheet } from './BreastfeedingDrillSheet';
import { useBackLayer } from '@/lib/back-navigation';

type Row = {
  ym: string;
  unitId: string;
  unitName: string;
  assessed: number;
  exclusive: number;
  percent: number;
};

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function BreastfeedingCard({ from, to, hcId }: { from: string; to: string; hcId?: string }) {
  const { user } = useAuth();
  const canDrill = user?.role === 'DINKES' || user?.role === 'PUSKESMAS';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(false);

  useBackLayer(drill, () => setDrill(false));

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/stats/breastfeeding?from=${from}&to=${to}${hcId ? `&scope=posyandu&hcId=${hcId}` : ''}`,
        );
        const d = await res.json();
        if (active && d.success) setRows(d.data ?? []);
      } catch (e) {
        console.error('Gagal memuat ASI Eksklusif:', e);
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
    const ms = rows.filter((r) => r.assessed > 0).map((r) => r.ym);
    return ms.sort().at(-1) ?? '';
  }, [rows]);

  const monthRows = useMemo(() => rows.filter((r) => r.ym === latest), [rows, latest]);
  const totals = useMemo(
    () =>
      monthRows.reduce((a, r) => ({ assessed: a.assessed + r.assessed, exclusive: a.exclusive + r.exclusive }), {
        assessed: 0,
        exclusive: 0,
      }),
    [monthRows],
  );
  const pct = totals.assessed > 0 ? Math.round((totals.exclusive / totals.assessed) * 100) : 0;

  const unitRows = useMemo(
    () => monthRows.filter((r) => r.assessed > 0).sort((a, b) => b.assessed - a.assessed),
    [monthRows],
  );

  if (loading && rows.length === 0) {
    return (
      <ChartCard title="ASI Eksklusif (Bayi)">
        <p className="py-6 text-center text-xs font-bold text-[#54656f]">Memuat data...</p>
      </ChartCard>
    );
  }

  if (!latest) {
    return (
      <ChartCard title="ASI Eksklusif (Bayi)" subtitle="Bayi 0–5 bulan">
        <p className="py-6 text-center text-xs font-bold text-[#54656f]">
          Belum ada jawaban ASI Eksklusif pada periode ini.
        </p>
      </ChartCard>
    );
  }

  return (
    <>
      <ChartCard title="ASI Eksklusif (Bayi)" subtitle={`Bulan ${formatYM(latest)} — bayi 0–5 bulan`}>
      <div className="flex items-center gap-3 p-3 rounded-xl border border-[#e9edef] bg-[#f0f2f5] mb-3">
        <div className="w-10 h-10 rounded-full bg-[#075e54] text-white flex items-center justify-center shrink-0">
          <Baby className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-black text-[#111b21] leading-none">{pct}%</p>
          <p className="text-[11px] text-[#54656f] font-bold mt-1">
            ASI eksklusif · {totals.exclusive} dari {totals.assessed} bayi dinilai
          </p>
        </div>
      </div>

      <div className="h-1.5 w-full bg-[#f0f2f5] rounded-full overflow-hidden mb-3">
        <div className="h-full bg-[#25d366] rounded-full" style={{ width: `${pct}%` }} />
      </div>

      {unitRows.length > (canDrill ? 0 : 1) && (
        <div className="space-y-1.5">
          {unitRows.slice(0, 10).map((r) => {
            const body = (
              <>
                <span className="text-xs font-bold text-[#111b21] truncate">{r.unitName || r.unitId}</span>
                <span className="text-[11px] font-bold text-[#54656f] shrink-0">
                  {r.exclusive}/{r.assessed} · <strong className="text-[#075e54]">{r.percent}%</strong>
                  {canDrill && <span className="text-[#128c7e]"> ›</span>}
                </span>
              </>
            );
            const rowCls =
              'w-full flex items-center justify-between gap-2 p-2 rounded-xl border border-[#e9edef] text-left';
            return canDrill ? (
              <button
                key={r.unitId}
                type="button"
                onClick={() => setDrill(true)}
                className={`${rowCls} hover:bg-[#f0f2f5] transition-colors`}
              >
                {body}
              </button>
            ) : (
              <div key={r.unitId} className={rowCls}>
                {body}
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>

      {drill && canDrill && (
        <BreastfeedingDrillSheet from={from} to={to} onClose={() => setDrill(false)} />
      )}
    </>
  );
}
