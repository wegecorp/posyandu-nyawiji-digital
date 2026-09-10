'use client';

import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Download, X, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { PeriodControl, periodToRange } from './analisis/PeriodControl';
import { useBackLayer } from '@/lib/back-navigation';

type Bucket = { abnormal: number; assessed: number };
type ReportRow = {
  unitId: string;
  unitName: string;
  registered: number;
  measured: number;
  balita: { total: number; normal: number; underweight: number; severelyUnderweight: number; riskOverweight: number };
  nt: { naik: number; tidakNaik: number; duaT: number; belumDinilai: number };
  indicators: Record<string, Bucket>;
};
type ReportPayload = {
  success: boolean;
  from: string;
  to: string;
  role: string;
  unitLabel: string;
  global: ReportRow;
  units: ReportRow[];
};

export function ReportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState('12m');
  const [data, setData] = useState<ReportPayload | null>(null);

  const { from, to } = React.useMemo(() => periodToRange(period), [period]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetch(`/api/stats/report?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => {
        if (active && d.success) setData(d);
      })
      .catch((e) => console.error('Gagal memuat rekap:', e));
    return () => {
      active = false;
    };
  }, [isOpen, from, to]);

  useBackLayer(isOpen, onClose);

  if (!isOpen) return null;

  const g = data?.global;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden border border-[#e9edef] flex flex-col max-h-[90vh]">
        <div className="bg-[#075e54] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[#25d366]" />
            <div>
              <h2 className="font-extrabold text-sm">Rekap Ringkas</h2>
              <p className="text-[11px] text-[#d1fae5]">{user?.healthCenterName || 'Kabupaten Gunungkidul'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15 text-white/80">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <PeriodControl selected={period} onChange={setPeriod} />

          {!g ? (
            <div className="py-10 flex flex-col items-center gap-2 text-xs font-bold text-[#54656f]">
              <RefreshCw className="w-5 h-5 animate-spin text-[#128c7e]" />
              Menyusun rekap...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Terdaftar" value={g.registered} />
                <Stat label="Terukur" value={g.measured} />
                <Stat label="2T — rujuk" value={g.nt.duaT} warn />
              </div>

              <div className="bg-[#f0f2f5] rounded-2xl border border-[#e9edef] p-3 text-[11px] text-[#54656f] space-y-1">
                <Row label="Balita dinilai gizi" value={g.balita.total} />
                <Row label="Gizi normal" value={g.balita.normal} />
                <Row label="Gizi kurang / sangat kurang" value={g.balita.underweight + g.balita.severelyUnderweight} />
                <Row label="BB naik (N)" value={g.nt.naik} />
                <Row label="BB tidak naik (T)" value={g.nt.tidakNaik} />
              </div>

              <p className="text-[10px] text-[#8696a0]">
                Rekap mencakup semua kategori umur (balita, anak, remaja, dewasa/lansia, bumil). Detail per
                indikator & {data?.unitLabel.toLowerCase()} tersedia di berkas Excel.
              </p>
            </>
          )}
        </div>

        <div className="p-4 pt-0 flex gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#111b21] font-bold rounded-full text-xs border border-[#e9edef]"
          >
            Tutup
          </button>
          <button
            onClick={() => window.open(`/api/stats/report?from=${from}&to=${to}&format=xlsx`, '_blank')}
            disabled={!data}
            className="flex-[2] py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-xs shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Unduh Rekap Excel
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-[#e9edef] text-center">
      <p className={`text-lg font-extrabold ${warn ? 'text-red-600' : 'text-[#111b21]'}`}>{value}</p>
      <p className="text-[10px] text-[#54656f] font-bold">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-bold">{label}</span>
      <span className="font-extrabold text-[#111b21]">{value}</span>
    </div>
  );
}
