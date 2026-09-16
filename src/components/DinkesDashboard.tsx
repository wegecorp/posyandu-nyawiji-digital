'use client';

import React, { useState, useEffect } from 'react';
import {
  Building,
  PlusCircle,
  FileSpreadsheet,
  ArrowRight,
  ChevronDown,
  X,
  Key,
  AlertTriangle,
  Check,
  RefreshCw,
  ShieldCheck,
  Info,
  Upload,
  Search,
  Users,
  Activity,
} from 'lucide-react';
import { puskesmasUsernameBase } from '@/lib/names';
import { useBackLayer } from '@/lib/back-navigation';

interface DinkesDashboardProps {
  onExportAll: () => void;
  onEnterPosyandu: (posyanduId: string, posyanduName: string, posyanduCode: string) => void;
}

interface KapanewonRef { id: string; code: string; name: string }
interface ImportReportShape {
  rowsTotal: number;
  puskesmasCreated: number;
  puskesmasUnknown: number;
  kalurahanCreated: number;
  posyanduCreated: number;
  posyanduSkipped: number;
  errors: { rowNo: number; message: string }[];
}
interface PosyanduRow {
  id: string;
  code: string;
  name: string;
  kalurahan: string;
  users?: { id: string; username: string; mustChangePassword: boolean }[];
  _count?: { patients: number; measurements: number };
}
interface PuskesmaRow {
  id: string;
  code: string;
  name: string;
  kapanewon: string;
  users?: { id: string; username: string; mustChangePassword: boolean }[];
  posyandus?: PosyanduRow[];
  _count?: { posyandus: number };
}

export const DinkesDashboard: React.FC<DinkesDashboardProps> = ({ onExportAll, onEnterPosyandu }) => {
  const [puskesmasList, setPuskesmasList] = useState<PuskesmaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllPos, setShowAllPos] = useState<Record<string, boolean>>({});

  const [kapanewonList, setKapanewonList] = useState<KapanewonRef[]>([]);

  // Create puskesmas modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cKapanewonId, setCKapanewonId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset modal
  const [resetTarget, setResetTarget] = useState<{ id: string; label: string; roleName: string } | null>(null);
  const [resetMsg, setResetMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Import modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<{ dryRun: boolean; report: ImportReportShape } | null>(null);
  const [importError, setImportError] = useState('');

  // Navigasi tombol back OS/hardware untuk modal dashboard.
  useBackLayer(isCreateOpen, () => setIsCreateOpen(false));
  useBackLayer(isImportOpen, () => setIsImportOpen(false));
  useBackLayer(Boolean(resetTarget), () => setResetTarget(null));

  const openImport = () => {
    setImportFile(null);
    setImportReport(null);
    setImportError('');
    setIsImportOpen(true);
  };

  const runImport = async (dry: boolean) => {
    if (!importFile) return;
    setImportBusy(true);
    setImportError('');
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await fetch(`/api/dinkes/import${dry ? '?dry=1' : ''}`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import gagal');
      setImportReport({ dryRun: dry, report: data.report });
      if (!dry) refresh();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setImportBusy(false);
    }
  };

  const refresh = () => {
    setIsLoading(true);
    fetch('/api/dinkes/puskesmas')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPuskesmasList(data.data);
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetch('/api/dinkes/puskesmas')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPuskesmasList(data.data);
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
    fetch('/api/lokasi')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setKapanewonList(json.data);
      })
      .catch(console.error);
  }, []);

  const openCreate = () => {
    setCName('');
    setCKapanewonId('');
    setErrorMsg('');
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim() || !cKapanewonId) {
      setErrorMsg('Nama Puskesmas dan Kapanewon wajib diisi');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/dinkes/puskesmas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cName.trim(),
          kapanewonId: cKapanewonId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun puskesmas');
      setIsCreateOpen(false);
      refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReset = (userId: string, label: string, roleName: string) => {
    setResetTarget({ id: userId, label, roleName });
    setResetMsg(null);
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    setResetSubmitting(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: resetTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mereset password');
      setResetMsg({ type: 'ok', text: data.message || 'Password direset ke password default.' });
    } catch (err: unknown) {
      setResetMsg({ type: 'err', text: err instanceof Error ? err.message : 'Terjadi kesalahan' });
    } finally {
      setResetSubmitting(false);
    }
  };

  // Totals
  const totalPosyandu = puskesmasList.reduce((acc, p) => acc + (p.posyandus?.length || 0), 0);
  const totalPasien = puskesmasList.reduce(
    (acc, p) => acc + (p.posyandus?.reduce((a, pos) => a + (pos._count?.patients || 0), 0) || 0),
    0
  );
  const totalPengukuran = puskesmasList.reduce(
    (acc, p) => acc + (p.posyandus?.reduce((a, pos) => a + (pos._count?.measurements || 0), 0) || 0),
    0
  );
  const totalPending = puskesmasList.reduce(
    (acc, p) =>
      acc +
      (p.users?.[0]?.mustChangePassword ? 1 : 0) +
      (p.posyandus?.filter((pos) => pos.users?.[0]?.mustChangePassword).length || 0),
    0
  );

  // Pencarian & grouping
  const q = searchQuery.trim().toLowerCase();
  const filteredPuskesmas = q ? puskesmasList.filter((pkm) => {
    const pkmMatch = pkm.name.toLowerCase().includes(q) || pkm.kapanewon.toLowerCase().includes(q);
    const posMatch = pkm.posyandus?.some(
      (pos) => pos.name.toLowerCase().includes(q) || pos.code.toLowerCase().includes(q) || pos.kalurahan.toLowerCase().includes(q)
    );
    return pkmMatch || posMatch;
  }) : puskesmasList;

  const groupByKalurahan = (posyandus: PosyanduRow[] = []) => {
    const groups = new Map<string, PosyanduRow[]>();
    const rows = q ? posyandus.filter(
      (pos) => pos.name.toLowerCase().includes(q) || pos.code.toLowerCase().includes(q) || pos.kalurahan.toLowerCase().includes(q)
    ) : posyandus;
    for (const pos of rows) {
      const key = pos.kalurahan || 'Lainnya';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(pos);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };

  const ActBadge = ({ pending }: { pending?: boolean }) =>
    pending ? (
      <span className="text-[10px] font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a] px-2 py-0.5 rounded-full flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> Aktivasi
      </span>
    ) : (
      <span className="text-[10px] font-bold bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] px-2 py-0.5 rounded-full flex items-center gap-1">
        <Check className="w-3 h-3" /> Aktif
      </span>
    );

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-20">
      {/* Banner */}
      <div className="bg-[#075e54] text-white rounded-[24px] p-5 shadow-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-full shrink-0">
            <Building className="w-6 h-6 text-[#25d366]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#25d366]/20 text-[#25d366] border border-[#25d366]/40 px-2.5 py-0.5 rounded-full">
              Pusat Kontrol Dinas Kesehatan
            </span>
            <h1 className="text-lg font-black leading-tight mt-1 truncate">Dinas Kesehatan Gunungkidul</h1>
            <p className="text-xs text-[#d1fae5]">Membuat akun Puskesmas & memantau seluruh Posyandu</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <SummaryStat label="Puskesmas" value={puskesmasList.length} />
          <SummaryStat label="Posyandu" value={totalPosyandu} />
          <SummaryStat label="Pasien" value={totalPasien} />
        </div>

        {totalPending > 0 && (
          <div className="flex items-center gap-1.5 text-[#fbbf24] font-bold text-xs bg-white/10 border border-[#fbbf24]/30 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {totalPending} akun menunggu aktivasi (password default belum diganti)
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs border-t border-white/15 pt-3">
          <span className="text-[#d1fae5] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#25d366]" />
            Total pengukuran tercatat: <strong className="text-white">{totalPengukuran}</strong>
          </span>
          <button
            onClick={onExportAll}
            className="flex items-center gap-1.5 bg-white text-[#075e54] hover:bg-[#e7fceb] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all touch-press"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Rekap Kabupaten</span>
          </button>
        </div>
      </div>

      {/* Action header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-sm font-black text-[#111b21]">Daftar Puskesmas</h2>
          <p className="text-xs text-[#54656f]">Staf login dengan username & password</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openImport}
            className="flex items-center gap-1.5 bg-white hover:bg-[#f0f2f5] text-[#111b21] border border-[#e9edef] font-bold px-4 py-2 rounded-full text-xs shadow-xs transition-all touch-press"
          >
            <Upload className="w-4 h-4 text-[#128c7e]" />
            <span>Import Posyandu</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold px-4 py-2 rounded-full text-xs shadow-xs transition-all touch-press"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Daftarkan Puskesmas</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-1 shadow-sm border border-[#e9edef] flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8696a0] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) setExpandedId(null);
            }}
            placeholder="Cari puskesmas / posyandu / kalurahan..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#f0f2f5] rounded-lg border border-[#e9edef] outline-none focus:bg-white focus:border focus:border-[#075e54] font-medium text-[#111b21] placeholder-[#8696a0] transition-all"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="w-8 h-8 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#54656f] rounded-lg flex items-center justify-center shrink-0"
            title="Bersihkan pencarian"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center gap-2 text-xs font-bold text-[#54656f]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#128c7e]" />
          Memuat data Puskesmas...
        </div>
      ) : filteredPuskesmas.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-[#e9edef] text-center space-y-2 shadow-xs">
          <p className="text-xs text-[#54656f] font-bold">Tidak ada data cocok dengan pencarian.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPuskesmas.map((pkm) => {
            const pkmUser = pkm.users?.[0];
            const pkmPending = !!pkmUser?.mustChangePassword;
            const isOpen = expandedId === pkm.id || !!q;
            const posCount = pkm.posyandus?.length || 0;
            const visiblePosyandus = showAllPos[pkm.id] ? pkm.posyandus : (pkm.posyandus ?? []).slice(0, 10);
            const groups = groupByKalurahan(visiblePosyandus);
            return (
              <div key={pkm.id} className="bg-white rounded-[20px] border border-[#e9edef] shadow-xs overflow-hidden">
                {/* Puskesmas header (click to expand) */}
                <button
                  onClick={() => toggleExpand(pkm.id)}
                  className="w-full p-4 text-left transition-all touch-press hover:bg-[#f0f2f5]/60 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className={`p-2.5 rounded-full shrink-0 ${isOpen ? 'bg-[#075e54] text-white' : 'bg-[#e7fceb] text-[#075e54]'}`}>
                      <Building className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-sm text-[#111b21]">{pkm.name}</h3>
                        <span className="font-mono text-[10px] bg-[#f0f2f5] text-[#54656f] border border-[#e9edef] px-2 py-0.5 rounded-full font-bold">
                          {pkm.code}
                        </span>
                        <ActBadge pending={pkmPending} />
                      </div>
                      <p className="text-xs text-[#54656f] font-medium mt-1 flex items-center gap-2">
                        <span>Kapanewon {pkm.kapanewon}</span>
                        <span className="text-[#8696a0]">•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[#128c7e]" />
                          {posCount} posyandu
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronDown className={`w-5 h-5 text-[#8696a0] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[#f0f2f5]">
                    {pkmUser?.username && (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] text-[#54656f] font-medium">
                          Login staf: <strong className="font-mono text-[#111b21] bg-[#f0f2f5] px-2 py-0.5 rounded-full">@{pkmUser.username}</strong>
                        </span>
                        {pkmUser && (
                          <button
                            onClick={() => openReset(pkmUser.id, pkm.name, 'Akun Puskesmas')}
                            className="px-3 py-1.5 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#128c7e] border border-[#e9edef] rounded-full text-xs font-bold transition-all flex items-center gap-1.5 touch-press"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Reset Pass</span>
                          </button>
                        )}
                      </div>
                    )}

                    {groups.length === 0 ? (
                      <p className="text-center text-xs text-[#8696a0] font-medium py-4">
                        Belum ada posyandu terdaftar di bawah puskesmas ini.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {groups.map(([kalurahan, posyandus]) => (
                          <div key={kalurahan}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[11px] font-black uppercase tracking-wider text-[#54656f]">
                                {kalurahan}
                              </span>
                              <span className="text-[10px] font-bold text-[#128c7e] bg-[#e7fceb] px-2 py-0.5 rounded-full">
                                {posyandus.length} posyandu
                              </span>
                              <div className="flex-1 h-px bg-[#e9edef]" />
                            </div>
                            <div className="space-y-2">
                              {posyandus.map((pos) => {
                                const posUser = pos.users?.[0];
                                return (
                                  <div
                                    key={pos.id}
                                    className="flex items-center justify-between gap-2 bg-[#f0f2f5]/70 hover:bg-[#f0f2f5] border border-[#e9edef] rounded-xl px-3 py-2.5 transition-all"
                                  >
                                    <div className="min-w-0 flex items-center gap-3 flex-1">
                                      <div className="w-8 h-8 rounded-full bg-white border border-[#e9edef] text-[#075e54] flex items-center justify-center font-black text-xs shrink-0">
                                        {pos.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <button
                                            onClick={() => onEnterPosyandu(pos.id, pos.name, pos.code)}
                                            className="text-[#111b21] hover:text-[#075e54] text-xs font-extrabold truncate transition-colors flex items-center gap-1"
                                          >
                                            {pos.name}
                                            <ArrowRight className="w-3 h-3 text-[#8696a0]" />
                                          </button>
                                          <ActBadge pending={posUser?.mustChangePassword} />
                                        </div>
                                        <p className="text-[11px] text-[#54656f] font-medium mt-0.5 flex items-center gap-2">
                                          <span className="font-mono">{pos.code}</span>
                                          <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3 text-[#128c7e]" />
                                            {pos._count?.patients || 0}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Activity className="w-3 h-3 text-[#25d366]" />
                                            {pos._count?.measurements || 0} ukur
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {posUser && (
                                        <button
                                          onClick={() => openReset(posUser.id, pos.name, 'Akun Posyandu')}
                                          className={`w-8 h-8 rounded-full bg-white border border-[#e9edef] flex items-center justify-center transition-all hover:bg-[#e9edef] ${posUser.mustChangePassword ? 'text-[#b45309]' : 'text-[#8696a0]'}`}
                                          title="Reset password akun posyandu"
                                        >
                                          <Key className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => onEnterPosyandu(pos.id, pos.name, pos.code)}
                                        className="py-2 px-3 bg-[#128c7e] hover:bg-[#075e54] text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 touch-press"
                                      >
                                        <span>Buka</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {posCount > 10 && !showAllPos[pkm.id] && (
                          <button
                            onClick={() => setShowAllPos((s) => ({ ...s, [pkm.id]: true }))}
                            className="w-full py-2.5 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#128c7e] border border-[#e9edef] rounded-xl text-xs font-bold transition-all touch-press"
                          >
                            Tampilkan semua ({posCount} posyandu)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Daftarkan Puskesmas */}
      {isCreateOpen && (
        <ModalShell title="Daftarkan Puskesmas Baru" subtitle="Dinas Kesehatan Kabupaten Gunungkidul" onClose={() => setIsCreateOpen(false)}>
          <form onSubmit={handleCreate} className="p-5 space-y-3.5">
            {errorMsg && <BannerError msg={errorMsg} />}

            <Field label="Nama Puskesmas" required>
              <input type="text" value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Contoh: Puskesmas Semanu I" required className={inputCls} />
            </Field>

            <Field label="Kapanewon" required>
              <select value={cKapanewonId} onChange={(e) => setCKapanewonId(e.target.value)} required className={inputCls}>
                <option value="">— Pilih Kapanewon —</option>
                {kapanewonList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="pt-1">
              <span className="text-[11px] font-bold text-[#128c7e] flex items-center gap-1.5 mb-2">
                <Key className="w-3.5 h-3.5" />
                <span>Login Staf Puskesmas</span>
              </span>
              <div className="p-3 bg-[#f0f2f5] rounded-2xl border border-[#e9edef] flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-[#54656f] font-medium">
                    Username dibuat otomatis dari nama puskesmas:
                  </p>
                  <p className="text-sm font-mono font-black text-[#111b21] mt-0.5 break-all">
                    {cName.trim() ? `@pkm_${puskesmasUsernameBase(cName)}` : '@pkm_...'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#f0f2f5] rounded-2xl border border-[#e9edef] text-[11px] text-[#111b21] font-medium flex gap-2">
              <Info className="w-4 h-4 shrink-0 text-[#128c7e]" />
              <p>
                Akun baru memakai <strong>password default puskesmas</strong> dan wajib diganti staf saat
                login pertama. Sampaikan username &amp; password default ke pengelola Puskesmas.
              </p>
            </div>

            <div className="pt-2 flex gap-2.5">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#111b21] font-bold rounded-full text-xs border border-[#e9edef]">
                Batal
              </button>
              <button type="submit" disabled={isSubmitting} className="flex-[2] py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-xs shadow-xs transition-all disabled:opacity-50">
                {isSubmitting ? 'Mendaftarkan...' : 'Simpan & Terbitkan Akun'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Import Posyandu */}
      {isImportOpen && (
        <ModalShell title="Import Data Posyandu (Massal)" subtitle="Dinas Kesehatan — upload CSV / Excel" onClose={() => setIsImportOpen(false)}>
          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="p-3 bg-[#f0f2f5] rounded-2xl border border-[#e9edef] text-[11px] text-[#111b21] font-medium flex gap-2">
              <Info className="w-4 h-4 shrink-0 text-[#128c7e]" />
              <p>
                 Format: kolom <strong>NAMA PUSKESMAS · NAMA KALURAHAN · NAMA PADUKUHAN · NAMA POSYANDU</strong>.
                 Puskesmas yang belum terdaftar akan <strong>dibuat otomatis</strong> (kapanewon disimpulkan dari
                 namanya) beserta akun stafnya. <strong>NAMA POSYANDU boleh dikosongkan</strong> bila hanya ingin
                 menambah Kalurahan. Import juga membuat akun posyandu dengan password default (keduanya wajib
                 aktivasi saat login pertama).
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-bold text-[#111b21] mb-1 block">Pilih File (.csv / .xlsx)</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null);
                  setImportReport(null);
                  setImportError('');
                }}
                className="block w-full text-xs text-[#54656f] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#128c7e] file:text-white hover:file:bg-[#075e54] cursor-pointer"
              />
            </label>
            {importFile && (
              <p className="text-[11px] font-bold text-[#128c7e]">
                Terpilih: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </p>
            )}

            {importError && <BannerError msg={importError} />}

            {importReport && (
              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-[#128c7e]">
                  {importReport.dryRun ? 'Hasil Analisis (belum disimpan)' : 'Hasil Import'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <SummaryCell label="Baris terbaca" value={importReport.report.rowsTotal} />
                  <SummaryCell label="Puskesmas dibuat" value={importReport.report.puskesmasCreated} tone="ok" />
                  <SummaryCell label="Kapanewon tak dikenali" value={importReport.report.puskesmasUnknown} tone={importReport.report.puskesmasUnknown > 0 ? 'warn' : 'ok'} />
                  <SummaryCell label="Kalurahan baru" value={importReport.report.kalurahanCreated} />
                  <SummaryCell label="Posyandu dibuat" value={importReport.report.posyanduCreated} tone="ok" />
                  <SummaryCell label="Duplikat (dilewati)" value={importReport.report.posyanduSkipped} />
                </div>
                {importReport.report.errors.length > 0 && (
                  <div className="p-3 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-2xl text-[11px] text-[#111b21] max-h-36 overflow-y-auto space-y-1">
                    <p className="font-black text-[#ef4444] text-xs">Error ({importReport.report.errors.length}):</p>
                    {importReport.report.errors.slice(0, 12).map((e, i) => (
                      <p key={i} className="font-medium text-[#54656f]">
                        <span className="text-[#ef4444] font-bold">Baris {e.rowNo}:</span> {e.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex gap-2.5">
              <button type="button" onClick={() => setIsImportOpen(false)} className="flex-1 py-3 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#111b21] font-bold rounded-full text-xs border border-[#e9edef]">
                Tutup
              </button>
              {!importReport?.dryRun && (
                <button
                  onClick={() => runImport(true)}
                  disabled={!importFile || importBusy}
                  className="flex-[2] py-3 bg-[#075e54] hover:bg-[#054c44] text-white font-bold rounded-full text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-4 h-4 ${importBusy ? 'animate-spin' : ''}`} />
                  <span>{importBusy ? 'Menganalisis...' : 'Analisis Dulu'}</span>
                </button>
              )}
              {importReport?.dryRun && (
                <button
                  onClick={() => runImport(false)}
                  disabled={importBusy}
                  className="flex-[2] py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-extrabold rounded-full text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>{importBusy ? 'Mengimpor...' : 'Import Sekarang'}</span>
                </button>
              )}
            </div>
          </div>
        </ModalShell>
      )}

      {/* Modal: Reset Password */}
      {resetTarget && (
        <ModalShell title={`Reset Password (${resetTarget.roleName})`} subtitle={resetTarget.label} onClose={() => setResetTarget(null)}>
          <div className="p-5 space-y-4">
            {resetMsg?.type === 'ok' && <BannerOk msg={resetMsg.text} />}
            {resetMsg?.type === 'err' && <BannerError msg={resetMsg.text} />}
            {!resetMsg && (
              <div className="p-3 bg-[#f0f2f5] rounded-2xl border border-[#e9edef] text-xs text-[#111b21] font-medium flex gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#128c7e]" />
                <p>
                  Password akun ini dikembalikan ke <strong>password default</strong>. Pemilik akun
                  wajib menggantinya saat login pertama berikutnya. Tidak perlu mengetik password baru di sini.
                </p>
              </div>
            )}
            <div className="pt-2 flex gap-2.5">
              <button type="button" onClick={() => setResetTarget(null)} className="flex-1 py-3 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#111b21] font-bold rounded-full text-xs border border-[#e9edef]">
                Tutup
              </button>
              {!resetMsg && (
                <button
                  onClick={handleReset}
                  disabled={resetSubmitting}
                  className="flex-[2] py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-extrabold rounded-full text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Key className="w-4 h-4" />
                  <span>{resetSubmitting ? 'Memproses...' : 'Ya, Reset ke Default'}</span>
                </button>
              )}
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

const inputCls =
  'w-full px-3.5 py-2.5 text-xs bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all';

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden border border-[#e9edef] flex flex-col max-h-[90vh]">
        <div className="bg-[#075e54] text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-sm">{title}</h2>
            {subtitle && <p className="text-[11px] text-[#d1fae5]">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#111b21] mb-1">
        {label} {required && <span className="text-[#ef4444]">*</span>}
      </label>
      {children}
    </div>
  );
}

function BannerError({ msg }: { msg: string }) {
  return (
    <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#ef4444] font-bold flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

function BannerOk({ msg }: { msg: string }) {
  return (
    <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl text-xs text-[#16a34a] font-bold flex items-center gap-2">
      <Check className="w-4 h-4 shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

function SummaryCell({ label, value, tone = 'normal' }: { label: string; value: number; tone?: 'normal' | 'ok' | 'warn' }) {
  const color = tone === 'ok' ? 'text-[#16a34a]' : tone === 'warn' ? 'text-[#b45309]' : 'text-[#111b21]';
  return (
    <div className="bg-[#f0f2f5] rounded-2xl p-3 border border-[#e9edef]">
      <p className={`text-lg font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-[#54656f] font-bold mt-0.5">{label}</p>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/10 border border-white/15 rounded-xl px-2 py-2.5">
      <p className="text-xl font-black text-white leading-none">{value}</p>
      <p className="text-[10px] font-bold text-[#d1fae5] mt-1">{label}</p>
    </div>
  );
}
