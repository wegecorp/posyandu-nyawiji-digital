import React, { useEffect, useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { ChartCard } from './ChartCard';

type Row = {
  ym: string;
  unitId: string;
  unitName: string;
  assessedByIndicator: Record<string, number>;
  abnormalByIndicator: Record<string, number>;
};

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function TbScreeningCard({ from, to }: { from: string; to: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats/outcomes?scope=posyandu&from=${from}&to=${to}`);
        const d = await res.json();
        if (active && d.success) setRows(d.data ?? []);
      } catch (e) {
        console.error('Gagal memuat skrining TB:', e);
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [from, to]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { assessed: number; risk: number }>();
    for (const r of rows) {
      const a = r.assessedByIndicator?.tbRisk ?? 0;
      const b = r.abnormalByIndicator?.tbRisk ?? 0;
      if (a === 0 && b === 0) continue;
      const cur = map.get(r.ym) ?? { assessed: 0, risk: 0 };
      cur.assessed += a;
      cur.risk += b;
      map.set(r.ym, cur);
    }
    return map;
  }, [rows]);

  const latest = useMemo(() => {
    const ms = [...byMonth.keys()].sort();
    return ms.at(-1) ?? '';
  }, [byMonth]);

  const totals = latest ? byMonth.get(latest)! : { assessed: 0, risk: 0 };
  const pct = totals.assessed > 0 ? Math.round((totals.risk / totals.assessed) * 100) : 0;

  const unitRows = useMemo(
    () =>
      rows
        .filter((r) => r.ym === latest && (r.abnormalByIndicator?.tbRisk ?? 0) > 0)
        .map((r) => ({ unitId: r.unitId, unitName: r.unitName, risk: r.abnormalByIndicator.tbRisk }))
        .sort((a, b) => b.risk - a.risk),
    [rows, latest],
  );

  if (loading && rows.length === 0) {
    return (
      <ChartCard title="Skrining Tuberkulosis (TB)">
        <p className="py-6 text-center text-xs font-bold text-[#54656f]">Memuat data...</p>
      </ChartCard>
    );
  }

  if (!latest) {
    return (
      <ChartCard title="Skrining Tuberkulosis (TB)" subtitle="Beresiko vs tidak beresiko">
        <p className="py-6 text-center text-xs font-bold text-[#54656f]">
          Belum ada jawaban skrining TB pada periode ini.
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Skrining Tuberkulosis (TB)" subtitle={`Bulan ${formatYM(latest)}`}>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center">
          <Activity className="w-5 h-5 text-[#075e54] mx-auto mb-1" />
          <p className="text-lg font-extrabold text-[#111b21]">{totals.assessed}</p>
          <p className="text-[10px] text-[#54656f] font-bold">Dinilai</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center">
          <p className="text-lg font-extrabold text-[#dc2626]">{totals.risk}</p>
          <p className="text-[10px] text-[#54656f] font-bold">Beresiko</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center">
          <p className="text-lg font-extrabold text-[#dc2626]">{pct}%</p>
          <p className="text-[10px] text-[#54656f] font-bold">% Beresiko</p>
        </div>
      </div>

      {unitRows.length > 0 && (
        <div className="space-y-1.5">
          {unitRows.slice(0, 10).map((r) => (
            <div
              key={r.unitId}
              className="flex items-center justify-between p-2 rounded-xl border border-red-100 bg-red-50/50"
            >
              <span className="text-xs font-bold text-[#111b21] truncate">{r.unitName || r.unitId}</span>
              <span className="text-[11px] font-bold text-red-600 shrink-0">{r.risk} beresiko</span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
