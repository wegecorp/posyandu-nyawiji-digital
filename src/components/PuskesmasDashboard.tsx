'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Building2,
  PlusCircle,
  Users,
  Activity,
  FileSpreadsheet,
  ArrowRight,
  X,
  Key,
  AlertTriangle,
  Check,
  MapPin,
  Pencil,
  Power,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Info,
  Search,
} from 'lucide-react';
import { useBackLayer } from '@/lib/back-navigation';

const inputCls =
  'w-full px-3.5 py-2.5 text-xs bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all';

const PAGE_SIZE = 10;

interface PuskesmasDashboardProps {
  onEnterPosyandu: (posyanduId: string, posyanduName: string, posyanduCode: string) => void;
  onExport: () => void;
}

interface KalurahanRef { id: string; code: string; name: string }
interface KapanewonRef { id: string; code: string; name: string; kalurahan: KalurahanRef[] }
interface PosyanduRow {
  id: string;
  code: string;
  name: string;
  kalurahan: string;
  kalurahanCode?: string;
  padukuhan: string;
  users?: { id: string; username: string; mustChangePassword: boolean; disabledAt?: string | null }[];
  _count?: { patients: number; measurements: number };
}

interface KalBlock {
  kalurahan: string;
  items: PosyanduRow[];
  isContinuation: boolean;
  total: number;
}

export const PuskesmasDashboard: React.FC<PuskesmasDashboardProps> = ({ onEnterPosyandu, onExport }) => {
  const { user } = useAuth();
  const [posyandus, setPosyandus] = useState<PosyanduRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Referensi lokasi (kapanewon -> kalurahan) dari server
  const [lokasi, setLokasi] = useState<KapanewonRef[]>([]);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cKalurahanId, setCKalurahanId] = useState('');
  const [cPadukuhan, setCPadukuhan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Edit modal
  const [editTarget, setEditTarget] = useState<PosyanduRow | null>(null);
  const [eName, setEName] = useState('');
  const [eKalurahanId, setEKalurahanId] = useState('');
  const [ePadukuhan, setEPadukuhan] = useState('');

  // Reset modal
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetMsg, setResetMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Nonaktif / hapus posyandu
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PosyanduRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [actionNote, setActionNote] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Navigasi tombol back OS/hardware untuk modal dashboard.
  useBackLayer(isCreateOpen, () => setIsCreateOpen(false));
  useBackLayer(Boolean(editTarget), () => setEditTarget(null));
  useBackLayer(Boolean(resetTarget), () => setResetTarget(null));
  useBackLayer(Boolean(deleteTarget), () => setDeleteTarget(null));

  // Kalurahan pilihan puskesmas ini (dalam kapanewon-nya)
  const myKalurahan: KalurahanRef[] =
    lokasi.find((k) => k.name === user?.kapanewon)?.kalurahan || [];

  const refreshList = () => {
    setIsLoading(true);
    fetch(`/api/posyandus?healthCenterId=${user?.healthCenterId || ''}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setPosyandus(data.data[0].posyandus || []);
        } else {
          setPosyandus([]);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetch(`/api/posyandus?healthCenterId=${user?.healthCenterId || ''}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setPosyandus(data.data[0].posyandus || []);
        } else {
          setPosyandus([]);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
    fetch('/api/lokasi')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setLokasi(json.data);
      })
      .catch(console.error);
  }, [user?.healthCenterId]);

  const openCreate = () => {
    setCName('');
    setCKalurahanId('');
    setCPadukuhan('');
    setErrorMsg('');
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim() || !cKalurahanId) {
      setErrorMsg('Nama posyandu dan kalurahan wajib diisi');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/posyandus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cName.trim(),
          kalurahanId: cKalurahanId,
          padukuhan: cPadukuhan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun posyandu');
      setIsCreateOpen(false);
      refreshList();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (pos: PosyanduRow) => {
    setEditTarget(pos);
    setEName(pos.name);
    setEKalurahanId(myKalurahan.find((k) => k.name === pos.kalurahan)?.id || '');
    setEPadukuhan(pos.padukuhan && pos.padukuhan !== '-' ? pos.padukuhan : '');
    setErrorMsg('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!eName.trim()) {
      setErrorMsg('Nama posyandu tidak boleh kosong');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/posyandus/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eName.trim(),
          kalurahanId: eKalurahanId || undefined,
          padukuhan: ePadukuhan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui posyandu');
      setEditTarget(null);
      refreshList();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
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

  const handleToggleStatus = async (pos: PosyanduRow) => {
    const userRow = pos.users?.[0];
    if (!userRow) return;
    const nextDisabled = !userRow.disabledAt;
    setStatusBusyId(pos.id);
    setActionNote(null);
    try {
      const res = await fetch(`/api/posyandus/${pos.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: nextDisabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status akun');
      setActionNote({
        type: 'ok',
        text: nextDisabled ? `Akun ${pos.name} dinonaktifkan.` : `Akun ${pos.name} diaktifkan kembali.`,
      });
      refreshList();
    } catch (err: unknown) {
      setActionNote({ type: 'err', text: err instanceof Error ? err.message : 'Terjadi kesalahan' });
    } finally {
      setStatusBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/posyandus/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus posyandu');
      setActionNote({ type: 'ok', text: `${deleteTarget.name} dihapus.` });
      setDeleteTarget(null);
      refreshList();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setDeleteBusy(false);
    }
  };

  const renderFormNotice = () => (
    <div className="p-3 bg-[#f0f2f5] rounded-2xl border border-[#e9edef] text-[11px] text-[#111b21] font-medium flex gap-2">
      <Info className="w-4 h-4 shrink-0 text-[#128c7e]" />
      <p>
        Akun baru memakai <strong>password default</strong> dan wajib diganti kader saat login pertama.
        Kader login dengan memilih Puskesmas → Kalurahan → Posyandu (tanpa username).
      </p>
    </div>
  );

  // Pencarian & ringkasan
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? posyandus.filter(
        (pos) =>
          pos.name.toLowerCase().includes(q) ||
          pos.code.toLowerCase().includes(q) ||
          pos.kalurahan.toLowerCase().includes(q) ||
          (pos.padukuhan && pos.padukuhan !== '-' && pos.padukuhan.toLowerCase().includes(q))
      )
    : posyandus;

  const totalPasien = posyandus.reduce((acc, p) => acc + (p._count?.patients || 0), 0);
  const totalUkur = posyandus.reduce((acc, p) => acc + (p._count?.measurements || 0), 0);
  const pendingCount = posyandus.filter((p) => p.users?.[0]?.mustChangePassword).length;

  const sorted = [...filtered].sort(
    (a, b) => a.kalurahan.localeCompare(b.kalurahan) || a.name.localeCompare(b.name)
  );
  const kalGroups: { kalurahan: string; items: PosyanduRow[] }[] = [];
  for (const pos of sorted) {
    const last = kalGroups[kalGroups.length - 1];
    if (last && last.kalurahan === pos.kalurahan) last.items.push(pos);
    else kalGroups.push({ kalurahan: pos.kalurahan, items: [pos] });
  }
  const pages: KalBlock[][] = [];
  let currentBlocks: KalBlock[] = [];
  let used = 0;
  for (const g of kalGroups) {
    let idx = 0;
    while (idx < g.items.length) {
      const remaining = PAGE_SIZE - used;
      const canFit = g.items.length - idx <= remaining;
      if (used > 0 && !canFit && g.items.length <= PAGE_SIZE) {
        pages.push(currentBlocks);
        currentBlocks = [];
        used = 0;
        continue;
      }
      const take = Math.min(remaining, g.items.length - idx);
      currentBlocks.push({
        kalurahan: g.kalurahan,
        items: g.items.slice(idx, idx + take),
        isContinuation: idx > 0,
        total: g.items.length,
      });
      used += take;
      idx += take;
      if (used >= PAGE_SIZE) {
        pages.push(currentBlocks);
        currentBlocks = [];
        used = 0;
      }
    }
  }
  if (currentBlocks.length) pages.push(currentBlocks);
  const totalPages = Math.max(1, pages.length);
  const currentPage = Math.min(page, totalPages);
  const pageBlocks = pages[currentPage - 1] ?? [];

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-20">
      {/* Banner */}
      <div className="bg-[#075e54] text-white rounded-[24px] p-5 shadow-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-full shrink-0">
            <Building2 className="w-6 h-6 text-[#25d366]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#25d366]/20 text-[#25d366] border border-[#25d366]/40 px-2.5 py-0.5 rounded-full">
              Akun Puskesmas
            </span>
            <h1 className="text-lg font-black leading-tight mt-1 truncate">{user?.name}</h1>
            {user?.kapanewon && <p className="text-xs text-[#d1fae5]">Kapanewon {user.kapanewon}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <SummaryStat label="Posyandu" value={posyandus.length} />
          <SummaryStat label="Pasien" value={totalPasien} />
          <SummaryStat label="Pengukuran" value={totalUkur} />
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 text-[#fbbf24] font-bold text-xs bg-white/10 border border-[#fbbf24]/30 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{pendingCount} akun posyandu menunggu aktivasi (password default belum diganti)</span>
          </div>
        )}

        <div className="border-t border-white/15 pt-3 flex justify-end">
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 bg-white text-[#075e54] hover:bg-[#e7fceb] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all touch-press"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Rekap Wilayah</span>
          </button>
        </div>
      </div>

      {actionNote && (
        <div
          className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            actionNote.type === 'ok'
              ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#16a34a]'
              : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
          }`}
        >
          <Info className="w-4 h-4 shrink-0" />
          <span>{actionNote.text}</span>
        </div>
      )}

      {/* Action header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-sm font-black text-[#111b21]">Akun Posyandu Binaan</h2>
          <p className="text-xs text-[#54656f]">1 akun per posyandu — dikelola Puskesmas</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold px-4 py-2 rounded-full text-xs shadow-xs transition-all touch-press"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Daftarkan Posyandu</span>
        </button>
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
              setPage(1);
            }}
            placeholder="Cari nama / kode posyandu, kalurahan, padukuhan..."
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
          Memuat posyandu binaan...
        </div>
      ) : posyandus.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-[#e9edef] text-center space-y-2 shadow-xs">
          <p className="text-xs text-[#54656f] font-bold">Belum ada akun Posyandu di bawah Puskesmas ini.</p>
          <button onClick={openCreate} className="text-xs text-[#128c7e] font-bold hover:underline">
            + Daftarkan Posyandu Sekarang
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-[#e9edef] text-center space-y-2 shadow-xs">
          <p className="text-xs text-[#54656f] font-bold">Tidak ada posyandu cocok dengan pencarian.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {q && (
            <p className="text-[11px] font-bold text-[#54656f]">
              Cocok {filtered.length} posyandu untuk &ldquo;{searchQuery.trim()}&rdquo;
            </p>
          )}
          {pageBlocks.map((block, blockIdx) => {
            const rows = block.items;
            return (
              <div key={`${block.kalurahan}-${block.isContinuation}-${blockIdx}`}>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-[#128c7e]" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#54656f]">
                    {block.kalurahan}
                    {block.isContinuation ? ' (lanjutan)' : ''}
                  </span>
                  <span className="text-[10px] font-bold text-[#128c7e] bg-[#e7fceb] px-2 py-0.5 rounded-full">
                    {block.total > block.items.length
                      ? `${rows.length} dari ${block.total} posyandu`
                      : `${rows.length} posyandu`}
                  </span>
                  <div className="flex-1 h-px bg-[#e9edef]" />
                </div>
                <div className="space-y-2.5">
                  {rows.map((pos) => {
                     const userRow = pos.users?.[0];
                     const pending = !!userRow?.mustChangePassword;
                     const disabled = !!userRow?.disabledAt;
                    return (
                      <div key={pos.id} className="bg-white rounded-[16px] p-4 border border-[#e9edef] shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-extrabold text-sm text-[#111b21]">{pos.name}</h3>
                              <span className="font-mono text-[10px] bg-[#f0f2f5] text-[#54656f] px-2 py-0.5 rounded-md font-bold border border-[#e9edef]">
                                {pos.code}
                              </span>
                               {disabled ? (
                                 <span className="text-[10px] font-bold bg-[#f0f2f5] text-[#54656f] border border-[#e9edef] px-2 py-0.5 rounded-full flex items-center gap-1">
                                   <Power className="w-3 h-3" /> Nonaktif
                                 </span>
                               ) : pending ? (
                                 <span className="text-[10px] font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a] px-2 py-0.5 rounded-full flex items-center gap-1">
                                   <AlertTriangle className="w-3 h-3" /> Menunggu aktivasi
                                 </span>
                               ) : (
                                 <span className="text-[10px] font-bold bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] px-2 py-0.5 rounded-full flex items-center gap-1">
                                   <Check className="w-3 h-3" /> Aktif
                                 </span>
                               )}
                            </div>
                            <div className="text-xs text-[#54656f] mt-1 font-medium flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#128c7e]" />
                              {pos.padukuhan && pos.padukuhan !== '-' ? `Padukuhan ${pos.padukuhan}, ` : ''}Kalurahan {pos.kalurahan}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => openEdit(pos)}
                              className="w-8 h-8 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#128c7e] border border-[#e9edef] rounded-full flex items-center justify-center transition-all touch-press"
                              title="Ubah nama / lokasi"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                             {userRow && (
                               <button
                                 onClick={() => {
                                   setResetTarget({ id: userRow.id, name: pos.name });
                                   setResetMsg(null);
                                 }}
                                 className="w-8 h-8 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#128c7e] border border-[#e9edef] rounded-full flex items-center justify-center transition-all touch-press"
                                 title="Reset password akun posyandu"
                               >
                                 <Key className="w-3.5 h-3.5" />
                               </button>
                             )}
                             {userRow && (
                               <button
                                 onClick={() => handleToggleStatus(pos)}
                                 disabled={statusBusyId === pos.id}
                                 className={`w-8 h-8 bg-[#f0f2f5] hover:bg-[#e9edef] border border-[#e9edef] rounded-full flex items-center justify-center transition-all touch-press disabled:opacity-50 ${disabled ? 'text-[#16a34a]' : 'text-[#b45309]'}`}
                                 title={disabled ? 'Aktifkan akun' : 'Nonaktifkan akun'}
                               >
                                 <Power className="w-3.5 h-3.5" />
                               </button>
                             )}
                             <button
                               onClick={() => {
                                 setDeleteTarget(pos);
                                 setDeleteError('');
                               }}
                               className="w-8 h-8 bg-white hover:bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] rounded-full flex items-center justify-center transition-all touch-press"
                               title="Hapus posyandu (hanya bila belum ada data)"
                             >
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                             <button
                               onClick={() => onEnterPosyandu(pos.id, pos.name, pos.code)}
                              className="py-2 px-3.5 bg-[#128c7e] hover:bg-[#075e54] text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 touch-press"
                            >
                              <span>Buka Meja</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3.5 text-xs text-[#54656f] pt-2 border-t border-[#f0f2f5]">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#128c7e]" />
                            <strong className="text-[#111b21]">{pos._count?.patients || 0}</strong> Pasien
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-[#25d366]" />
                            <strong className="text-[#111b21]">{pos._count?.measurements || 0}</strong> Pengukuran
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3.5 py-2 bg-white hover:bg-[#f0f2f5] text-[#128c7e] border border-[#e9edef] rounded-full text-xs font-bold disabled:opacity-40 transition-all touch-press"
              >
                ‹ Sebelumnya
              </button>
              <span className="text-[11px] font-bold text-[#54656f]">
                Halaman {currentPage}/{totalPages} · {filtered.length} posyandu
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3.5 py-2 bg-white hover:bg-[#f0f2f5] text-[#128c7e] border border-[#e9edef] rounded-full text-xs font-bold disabled:opacity-40 transition-all touch-press"
              >
                Berikutnya ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Hapus Posyandu */}
      {deleteTarget && (
        <ModalShell
          title="Hapus Posyandu"
          subtitle={`${deleteTarget.name} · ${deleteTarget.code}`}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="p-5 space-y-4">
            {deleteError && <BannerError msg={deleteError} />}
            <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#111b21] font-medium flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
              <p>
                Hapus <strong>permanen</strong> posyandu ini beserta akunnya. Hanya boleh bila posyandu
                <strong> belum punya pasien &amp; pengukuran</strong>. Bila sudah ada data, sistem menolak —
                gunakan <strong>Nonaktifkan</strong> sebagai gantinya.
              </p>
            </div>
            <div className="pt-2 flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#111b21] font-bold rounded-full text-xs border border-[#e9edef]"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteBusy}
                className="flex-[2] py-3 bg-[#ef4444] hover:bg-[#dc2626] text-white font-extrabold rounded-full text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleteBusy ? 'Menghapus...' : 'Ya, Hapus Posyandu'}</span>
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Modal: Daftarkan Posyandu */}
      {isCreateOpen && (
        <ModalShell title="Daftarkan Posyandu Baru" subtitle={`Di bawah ${user?.name}`} onClose={() => setIsCreateOpen(false)}>
          <form onSubmit={handleCreate} className="p-5 space-y-3.5">
            {errorMsg && <BannerError msg={errorMsg} />}
            {myKalurahan.length === 0 && (
              <div className="p-3 bg-[#fef3c7] border border-[#fde68a] rounded-2xl text-xs text-[#111b21] font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0" />
                <span>
                  Referensi kalurahan belum tersedia untuk kapanewon ini. Kalurahan harus di-seed / import oleh Dinas Kesehatan terlebih dahulu.
                </span>
              </div>
            )}

            <Field label="Nama Posyandu" required>
              <input
                type="text"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                placeholder="Contoh: Posyandu Melati"
                required
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Kalurahan" required>
                <select
                  value={cKalurahanId}
                  onChange={(e) => setCKalurahanId(e.target.value)}
                  required
                  disabled={myKalurahan.length === 0}
                  className={inputCls}
                >
                  <option value="">— Pilih —</option>
                  {myKalurahan.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Padukuhan">
                <input
                  type="text"
                  value={cPadukuhan}
                  onChange={(e) => setCPadukuhan(e.target.value)}
                  placeholder="Contoh: Purbosari"
                  className={inputCls}
                />
              </Field>
            </div>

            {renderFormNotice()}

            <div className="pt-2 flex gap-2.5">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#111b21] font-bold rounded-full text-xs border border-[#e9edef]">
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || myKalurahan.length === 0}
                className="flex-[2] py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-xs shadow-xs transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Mendaftarkan...' : 'Simpan & Terbitkan Akun'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Ubah Posyandu */}
      {editTarget && (
        <ModalShell title="Ubah Posyandu" subtitle={`${editTarget.name} · ${editTarget.code}`} onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="p-5 space-y-3.5">
            {errorMsg && <BannerError msg={errorMsg} />}
            <Field label="Nama Posyandu" required>
              <input type="text" value={eName} onChange={(e) => setEName(e.target.value)} required className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Kalurahan">
                <select value={eKalurahanId} onChange={(e) => setEKalurahanId(e.target.value)} className={inputCls}>
                  {myKalurahan.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Padukuhan">
                <input type="text" value={ePadukuhan} onChange={(e) => setEPadukuhan(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <p className="text-[11px] text-[#54656f] font-medium">
              Kode posyandu tidak berubah. Nama boleh sama dengan posyandu lain — identitas memakai kode unik.
            </p>
            <div className="pt-2 flex gap-2.5">
              <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-3 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#111b21] font-bold rounded-full text-xs border border-[#e9edef]">
                Batal
              </button>
              <button type="submit" disabled={isSubmitting} className="flex-[2] py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-xs shadow-xs transition-all disabled:opacity-50">
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Reset Password */}
      {resetTarget && (
        <ModalShell title="Reset Password Akun" subtitle={resetTarget.name} onClose={() => setResetTarget(null)}>
          <div className="p-5 space-y-4">
            {resetMsg?.type === 'ok' && <BannerOk msg={resetMsg.text} />}
            {resetMsg?.type === 'err' && <BannerError msg={resetMsg.text} />}
            {!resetMsg && (
              <div className="p-3 bg-[#f0f2f5] rounded-2xl border border-[#e9edef] text-xs text-[#111b21] font-medium flex gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#128c7e]" />
                <p>
                  Password akun ini dikembalikan ke <strong>password default</strong>. Kader wajib
                  menggantinya saat login pertama berikutnya (aktivasi ulang). Tidak perlu mengetik
                  password baru di sini.
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

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/10 border border-white/15 rounded-xl px-2 py-2.5">
      <p className="text-xl font-black text-white leading-none">{value}</p>
      <p className="text-[10px] font-bold text-[#d1fae5] mt-1">{label}</p>
    </div>
  );
}
