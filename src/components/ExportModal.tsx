'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Download, X, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { PeriodControl, periodToRange } from './analisis/PeriodControl';
import { useBackLayer } from '@/lib/back-navigation';

type Include = 'anggota' | 'detail' | 'beresiko';

interface PreviewShape {
  success: boolean;
  from: string;
  to: string;
  unitLabel: string;
  global: {
    registered: number;
    measured: number;
    nt: { duaT: number };
  };
  estimates: { units: number; patients: number; measurements: number; rows: number };
  limits: { units: number; rows: number };
  canDetails: boolean;
}

export function ExportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const role = user?.role ?? 'POSYANDU';
  const canDetails = role !== 'DINKES';

  const [period, setPeriod] = useState('12m');
  const [include, setInclude] = useState<Set<Include>>(new Set());
  const [scopeAll, setScopeAll] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [preview, setPreview] = useState<PreviewShape | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const { from, to } = useMemo(() => periodToRange(period), [period]);

  useBackLayer(isOpen, onClose);

  // Muat daftar posyandu (hanya PUSKESMAS yang boleh memilih unit).
  useEffect(() => {
    if (!isOpen || role !== 'PUSKESMAS') return;
    fetch('/api/posyandus')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.[0]) {
          setUnits((d.data[0].posyandus ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
        }
      })
      .catch(() => {});
  }, [isOpen, role]);

  const includeArr = useMemo(() => [...include], [include]);
  const selectedArr = useMemo(() => [...selected], [selected]);

  const unitIdsQuery =
    role === 'PUSKESMAS' && !scopeAll && selectedArr.length > 0 ? `&unitIds=${selectedArr.join(',')}` : '';
  const includeQuery = includeArr.length > 0 ? `&include=${includeArr.join(',')}` : '';
  const baseQuery = `from=${from}&to=${to}${includeQuery}${unitIdsQuery}`;

  // Preview (angka ringkasan + estimasi baris).
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/stats/report?${baseQuery}`);
        const d = await res.json();
        if (active && d.success) setPreview(d);
      } catch {
        if (active) setError('Gagal memuat preview.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [isOpen, baseQuery]);

  const wantNames = include.has('anggota') || include.has('detail') || include.has('beresiko');
  const overUnits = wantNames && !!preview && preview.estimates.units > preview.limits.units;
  const overRows = wantNames && !!preview && preview.estimates.rows > preview.limits.rows;
  const blocked = overUnits || overRows || (wantNames && role === 'PUSKESMAS' && !scopeAll && selected.size === 0);

  const toggleInclude = (key: Include) => {
    setInclude((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleUnit = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      const res = await fetch(`/api/stats/report?${baseQuery}&format=xlsx`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal mengunduh export');
      }
      const blob = await res.blob();
      const disp = res.headers.get('Content-Disposition') ?? '';
      const match = disp.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? `Rekap_${to}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunduh export');
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  const scopeLabel = role === 'POSYANDU' ? user?.posyanduName ?? 'Posyandu Anda' : role === 'DINKES' ? 'Seluruh Kabupaten Gunungkidul' : scopeAll ? 'Semua posyandu binaan' : `${selected.size} posyandu dipilih`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden border border-[#e9edef] flex flex-col max-h-[92vh]">
        <div className="bg-[#075e54] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[#25d366]" />
            <div>
              <h2 className="font-extrabold text-sm">Export Data (Excel)</h2>
              <p className="text-[11px] text-[#d1fae5]">{scopeLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15 text-white/80">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* 1. Isi */}
          <section className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#075e54]">1 · Isi</p>
            <label className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-[#e9edef] bg-[#f0f2f5]">
              <span className="text-xs font-bold text-[#111b21]">Ringkasan (agregat)</span>
              <span className="text-[10px] font-bold text-[#075e54] bg-[#e7fceb] border border-[#25d366]/30 px-2 py-0.5 rounded-full">Selalu</span>
            </label>
            {canDetails && (
              <>
                <CheckRow label="Daftar Anggota (per pasien)" checked={include.has('anggota')} onToggle={() => toggleInclude('anggota')} />
                <CheckRow label="Detail Pengukuran (per kunjungan)" checked={include.has('detail')} onToggle={() => toggleInclude('detail')} />
                <CheckRow label="Daftar Berisiko (2T / TB / temuan abnormal)" checked={include.has('beresiko')} onToggle={() => toggleInclude('beresiko')} />
              </>
            )}
            {!canDetails && (
              <p className="text-[10px] text-[#8696a0] font-medium">
                Akun Dinas Kesehatan hanya menerima rekap agregat (tanpa data per pasien).
              </p>
            )}
          </section>

          {/* 2. Cakupan */}
          {role === 'PUSKESMAS' && (
            <section className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#075e54]">2 · Cakupan</p>
              <div className="flex bg-white p-1 rounded-xl border border-[#e9edef] text-xs font-semibold text-[#54656f]">
                <button
                  onClick={() => setScopeAll(true)}
                  className={`flex-1 py-2 rounded-lg transition-all ${scopeAll ? 'bg-[#075e54] text-white' : 'hover:text-[#111b21]'}`}
                >
                  Semua binaan
                </button>
                <button
                  onClick={() => setScopeAll(false)}
                  className={`flex-1 py-2 rounded-lg transition-all ${!scopeAll ? 'bg-[#075e54] text-white' : 'hover:text-[#111b21]'}`}
                >
                  Pilih posyandu
                </button>
              </div>

              {!scopeAll && (
                <div className="max-h-44 overflow-y-auto border border-[#e9edef] rounded-2xl divide-y divide-[#f0f2f5]">
                  {units.length === 0 ? (
                    <p className="p-3 text-[11px] text-[#8696a0] font-medium">Memuat daftar posyandu...</p>
                  ) : (
                    units.map((u) => (
                      <label key={u.id} className="flex items-center gap-2.5 p-2.5 text-xs font-medium text-[#111b21]">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleUnit(u.id)}
                          className="w-4 h-4 accent-[#128c7e]"
                        />
                        <span className="truncate">{u.name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </section>
          )}

          {/* 3. Periode */}
          <section className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#075e54]">3 · Periode</p>
            <PeriodControl selected={period} onChange={setPeriod} />
          </section>

          {/* Preview */}
          <section className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#075e54]">Preview</p>
            {loading ? (
              <div className="py-6 flex flex-col items-center gap-2 text-xs font-bold text-[#54656f]">
                <RefreshCw className="w-5 h-5 animate-spin text-[#128c7e]" />
                Memuat preview...
              </div>
            ) : preview ? (
              <div className="bg-[#f0f2f5] rounded-2xl border border-[#e9edef] p-3 space-y-2 text-[11px] text-[#54656f]">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <PreviewStat label="Unit" value={preview.estimates.units} />
                  <PreviewStat label="Pasien" value={preview.estimates.patients} />
                  <PreviewStat label="Kunjungan" value={preview.estimates.measurements} />
                </div>
                <div className="flex justify-between pt-1 border-t border-[#e9edef]">
                  <span>Terdaftar: <strong className="text-[#111b21]">{preview.global.registered}</strong></span>
                  <span>Terukur: <strong className="text-[#111b21]">{preview.global.measured}</strong></span>
                  <span>2T: <strong className="text-[#dc2626]">{preview.global.nt.duaT}</strong></span>
                </div>
                {wantNames && (
                  <p className={`font-bold ${overRows || overUnits ? 'text-[#dc2626]' : 'text-[#075e54]'}`}>
                    Estimasi baris data pasien: {preview.estimates.rows.toLocaleString('id-ID')}
                    {overRows && ` — melebihi batas ${preview.limits.rows.toLocaleString('id-ID')}`}
                    {overUnits && ` — posyandu melebihi batas ${preview.limits.units}`}
                  </p>
                )}
              </div>
            ) : null}
          </section>

          {error && (
            <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#ef4444] font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
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
            onClick={handleDownload}
            disabled={loading || downloading || blocked}
            className="flex-[2] py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-xs shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{downloading ? 'Menyusun...' : 'Unduh Excel'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all text-left ${
        checked ? 'bg-[#e7fceb] border-[#25d366]/40' : 'bg-white border-[#e9edef] hover:bg-[#f0f2f5]'
      }`}
    >
      <span className="text-xs font-bold text-[#111b21]">{label}</span>
      <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${checked ? 'bg-[#075e54] border-[#075e54]' : 'border-[#cbd5e1] bg-white'}`}>
        {checked && <Check className="w-3.5 h-3.5 text-white" />}
      </span>
    </button>
  );
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl p-2.5 border border-[#e9edef]">
      <p className="text-base font-extrabold text-[#111b21]">{value}</p>
      <p className="text-[10px] text-[#54656f] font-bold">{label}</p>
    </div>
  );
}
