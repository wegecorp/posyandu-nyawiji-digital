'use client';

import React, { useState, useEffect } from 'react';
import {
  Building,
  PlusCircle,
  FileSpreadsheet,
  ArrowRight,
  X,
  Key,
  AlertTriangle,
  Check,
  RefreshCw,
  ShieldCheck,
  Info,
  Upload,
} from 'lucide-react';

interface DinkesDashboardProps {
  onExportAll: () => void;
  onEnterPosyandu: (posyanduId: string, posyanduName: string, posyanduCode: string) => void;
}

interface KapanewonRef { id: string; code: string; name: string }
interface ImportReportShape {
  rowsTotal: number;
  puskesmasNotFound: number;
  kalurahanCreated: number;
  posyanduCreated: number;
  posyanduSkipped: number;
  errors: { rowNo: number; message: string }[];
}
interface PuskesmaRow {
  id: string;
  code: string;
  name: string;
  kapanewon: string;
  users?: { id: string; username: string; mustChangePassword: boolean }[];
  posyandus?: {
    id: string;
    code: string;
    name: string;
    kalurahan: string;
    users?: { id: string; username: string; mustChangePassword: boolean }[];
  }[];
  _count?: { posyandus: number };
}

export const DinkesDashboard: React.FC<DinkesDashboardProps> = ({ onExportAll, onEnterPosyandu }) => {
  const [puskesmasList, setPuskesmasList] = useState<PuskesmaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [kapanewonList, setKapanewonList] = useState<KapanewonRef[]>([]);

  // Create puskesmas modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [cName, setCName] = useState('');
  const [cKapanewonId, setCKapanewonId] = useState('');
  const [cUsername, setCUsername] = useState('');
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

  const openCreate = () => {    setCName('');
    setCKapanewonId('');
    setCUsername('');
    setErrorMsg('');
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim() || !cKapanewonId || !cUsername.trim()) {
      setErrorMsg('Nama Puskesmas, Kapanewon, dan Username wajib diisi');
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
          username: cUsername.trim(),
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

  const totalPosyandu = puskesmasList.reduce((acc, p) => acc + (p.posyandus?.length || 0), 0);
  const totalPending = puskesmasList.reduce(
    (acc, p) =>
      acc +
      (p.users?.[0]?.mustChangePassword ? 1 : 0) +
      (p.posyandus?.filter((pos) => pos.users?.[0]?.mustChangePassword).length || 0),
    0
  );

  const ActBadge = ({ pending }: { pending?: boolean }) =>
    pending ? (
      <span className="text-[10px] font-bold bg-[#f59e0b]/15 text-[#b45309] border border-[#f59e0b]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> Aktivasi
      </span>
    ) : (
      <span className="text-[10px] font-bold bg-[#10b981]/10 text-[#047857] border border-[#10b981]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
        <Check className="w-3 h-3" /> Aktif
      </span>
    );

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-20">
      {/* Banner */}
      <div className="bg-[#0f172a] text-white rounded-[28px] p-6 shadow-md space-y-4 border border-[#e2e8f0]/20">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-full">
            <Building className="w-6 h-6 text-[#8b5cf6]" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#8b5cf6] px-2.5 py-0.5 rounded-full text-white">
              Pusat Kontrol Dinas Kesehatan
            </span>
            <h1 className="text-lg font-black leading-tight mt-1">Dinas Kesehatan Gunungkidul</h1>
            <p className="text-xs text-[#cbd5e1]">Membuat akun Puskesmas & memantau seluruh Posyandu</p>
          </div>
        </div>
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <div>
            <span>
              Puskesmas: <strong className="text-white">{puskesmasList.length}</strong> · Posyandu:{' '}
              <strong className="text-white">{totalPosyandu}</strong>
            </span>
            {totalPending > 0 && (
              <div className="mt-1 flex items-center gap-1.5 text-[#fbbf24] font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {totalPending} akun menunggu aktivasi
              </div>
            )}
          </div>
          <button
            onClick={onExportAll}
            className="flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all touch-press"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Se-Kabupaten</span>
          </button>
        </div>
      </div>

      {/* Action header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-sm font-black text-[#0f172a]">Daftar Puskesmas</h2>
          <p className="text-xs text-[#64748b]">Staf login dengan username & password (bukan cascade)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openImport}
            className="flex items-center gap-1.5 bg-white hover:bg-[#f0f7ff] text-[#0f172a] border border-[#cbd5e1] font-bold px-4 py-2 rounded-full text-xs shadow-xs transition-all touch-press"
          >
            <Upload className="w-4 h-4" />
            <span>Import Posyandu</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white font-bold px-4 py-2 rounded-full text-xs shadow-xs transition-all touch-press"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Daftarkan Puskesmas</span>
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center gap-2 text-xs font-bold text-[#64748b]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#8b5cf6]" />
          Memuat data Puskesmas...
        </div>
      ) : (
        <div className="space-y-3">
          {puskesmasList.map((pkm) => {
            const pkmUser = pkm.users?.[0];
            return (
            <div key={pkm.id} className="bg-white rounded-[20px] p-4 border border-[#e2e8f0] shadow-xs space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm text-[#0f172a]">{pkm.name}</h3>
                    <span className="font-mono text-[10px] bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 px-2 py-0.5 rounded-full font-bold">
                      {pkm.code}
                    </span>
                    <ActBadge pending={pkm.users?.[0]?.mustChangePassword} />
                  </div>
                  <p className="text-xs text-[#64748b] font-medium mt-0.5">
                    Kapanewon {pkm.kapanewon} · {pkm._count?.posyandus || 0} posyandu
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pkmUser?.username && (
                    <span className="text-[11px] font-mono bg-[#f0f7ff] text-[#0f172a] px-2.5 py-1 rounded-full border border-[#e2e8f0]">
                      @{pkmUser.username}
                    </span>
                  )}
                  {pkmUser && (
                    <button
                      onClick={() => openReset(pkmUser.id, pkm.name, 'Akun Puskesmas')}
                      className="px-3 py-1.5 bg-[#f0f7ff] hover:bg-[#e2e8f0] text-[#8b5cf6] border border-[#cbd5e1] rounded-full text-xs font-bold transition-all flex items-center gap-1.5 touch-press"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Reset Pass</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-[#f0f7ff] p-3.5 rounded-2xl border border-[#e2e8f0] space-y-2">
                <span className="text-[11px] font-bold text-[#0f172a]">
                  Posyandu Terdaftar ({pkm.posyandus?.length || 0}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {pkm.posyandus?.map((pos) => {
                    const posUser = pos.users?.[0];
                    return (
                    <div
                      key={pos.id}
                      className="flex items-center gap-1.5 bg-white border border-[#cbd5e1] rounded-full px-2 py-1 shadow-xs"
                    >
                      <button
                        onClick={() => onEnterPosyandu(pos.id, pos.name, pos.code)}
                        className="text-[#0f172a] hover:text-[#0284c7] text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <span>{pos.name}</span>
                        <ArrowRight className="w-3 h-3 text-[#94a3b8]" />
                      </button>
                      {posUser && (
                        <button
                          onClick={() => openReset(posUser.id, pos.name, 'Akun Posyandu')}
                          className={`text-[#94a3b8] hover:text-[#0284c7] transition-all ${posUser.mustChangePassword ? 'text-[#b45309]' : ''}`}
                          title={`Reset password / lihat status ${pos.name}`}
                        >
                          <Key className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Modal: Daftarkan Puskesmas */}
      {isCreateOpen && (
        <ModalShell title="Daftarkan Puskesmas Baru" subtitle="Dinas Kesehatan Kabupaten Gunungkidul" accent="bg-[#8b5cf6]" onClose={() => setIsCreateOpen(false)}>
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
              <span className="text-[11px] font-bold text-[#8b5cf6] flex items-center gap-1.5 mb-2">
                <Key className="w-3.5 h-3.5" />
                <span>Login Staf Puskesmas</span>
              </span>
              <Field label="Username" required>
                <input
                  type="text"
                  value={cUsername}
                  onChange={(e) => setCUsername(e.target.value)}
                  placeholder="Contoh: pkm_semanu1"
                  autoComplete="off"
                  required
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="p-3 bg-[#f0f7ff] rounded-2xl border border-[#cbd5e1] text-[11px] text-[#0f172a] font-medium flex gap-2">
              <Info className="w-4 h-4 shrink-0 text-[#8b5cf6]" />
              <p>
                Akun baru memakai <strong>password default</strong> dan wajib diganti staf saat login pertama.
                Sampaikan password default ke pengelola Puskesmas.
              </p>
            </div>

            <div className="pt-2 flex gap-2.5">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-[#f0f7ff] hover:bg-[#e2e8f0] text-[#0f172a] font-bold rounded-full text-xs border border-[#cbd5e1]">
                Batal
              </button>
              <button type="submit" disabled={isSubmitting} className="flex-2 py-3 bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white font-bold rounded-full text-xs shadow-xs transition-all disabled:opacity-50">
                {isSubmitting ? 'Mendaftarkan...' : 'Simpan & Terbitkan Akun'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Import Posyandu */}
      {isImportOpen && (
        <ModalShell title="Import Data Posyandu (Massal)" subtitle="Dinas Kesehatan — upload CSV / Excel" accent="bg-[#0284c7]" onClose={() => setIsImportOpen(false)}>
          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="p-3 bg-[#f0f7ff] rounded-2xl border border-[#cbd5e1] text-[11px] text-[#0f172a] font-medium flex gap-2">
              <Info className="w-4 h-4 shrink-0 text-[#0284c7]" />
              <p>
                Format: kolom <strong>NAMA PUSKESMAS · NAMA KALURAHAN · NAMA PADUKUHAN · NAMA POSYANDU</strong>.
                Puskesmas harus sudah didaftarkan lebih dulu (cocok berdasarkan nama). Import membuat akun posyandu
                dengan password default (wajib aktivasi saat login pertama).
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-bold text-[#0f172a] mb-1 block">Pilih File (.csv / .xlsx)</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null);
                  setImportReport(null);
                  setImportError('');
                }}
                className="block w-full text-xs text-[#64748b] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#0284c7] file:text-white hover:file:bg-[#0369a1] cursor-pointer"
              />
            </label>
            {importFile && (
              <p className="text-[11px] font-bold text-[#0284c7]">
                Terpilih: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </p>
            )}

            {importError && <BannerError msg={importError} />}

            {importReport && (
              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-[#0284c7]">
                  {importReport.dryRun ? 'Hasil Analisis (belum disimpan)' : 'Hasil Import'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <SummaryCell label="Baris terbaca" value={importReport.report.rowsTotal} />
                  <SummaryCell label="Puskesmas tak ditemukan" value={importReport.report.puskesmasNotFound} tone={importReport.report.puskesmasNotFound > 0 ? 'warn' : 'ok'} />
                  <SummaryCell label="Kalurahan baru" value={importReport.report.kalurahanCreated} />
                  <SummaryCell label="Posyandu dibuat" value={importReport.report.posyanduCreated} tone="ok" />
                  <SummaryCell label="Duplikat (dilewati)" value={importReport.report.posyanduSkipped} />
                </div>
                {importReport.report.errors.length > 0 && (
                  <div className="p-3 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-2xl text-[11px] text-[#0f172a] max-h-36 overflow-y-auto space-y-1">
                    <p className="font-black text-[#ef4444] text-xs">Error ({importReport.report.errors.length}):</p>
                    {importReport.report.errors.slice(0, 12).map((e, i) => (
                      <p key={i} className="font-medium text-[#64748b]">
                        <span className="text-[#ef4444] font-bold">Baris {e.rowNo}:</span> {e.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex gap-2.5">
              <button type="button" onClick={() => setIsImportOpen(false)} className="flex-1 py-3 bg-[#f0f7ff] hover:bg-[#e2e8f0] text-[#0f172a] font-bold rounded-full text-xs border border-[#cbd5e1]">
                Tutup
              </button>
              {!importReport?.dryRun && (
                <button
                  onClick={() => runImport(true)}
                  disabled={!importFile || importBusy}
                  className="flex-2 py-3 bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold rounded-full text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-4 h-4 ${importBusy ? 'animate-spin' : ''}`} />
                  <span>{importBusy ? 'Menganalisis...' : 'Analisis Dulu'}</span>
                </button>
              )}
              {importReport?.dryRun && (
                <button
                  onClick={() => runImport(false)}
                  disabled={importBusy}
                  className="flex-2 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold rounded-full text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
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
        <ModalShell title={`Reset Password (${resetTarget.roleName})`} subtitle={resetTarget.label} accent="bg-[#0f172a]" onClose={() => setResetTarget(null)}>
          <div className="p-5 space-y-4">
            {resetMsg?.type === 'ok' && <BannerOk msg={resetMsg.text} />}
            {resetMsg?.type === 'err' && <BannerError msg={resetMsg.text} />}
            {!resetMsg && (
              <div className="p-3 bg-[#f0f7ff] rounded-2xl border border-[#cbd5e1] text-xs text-[#0f172a] font-medium flex gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#8b5cf6]" />
                <p>
                  Password akun ini dikembalikan ke <strong>password default</strong>. Pemilik akun
                  wajib menggantinya saat login pertama berikutnya. Tidak perlu mengetik password baru di sini.
                </p>
              </div>
            )}
            <div className="pt-2 flex gap-2.5">
              <button type="button" onClick={() => setResetTarget(null)} className="flex-1 py-3 bg-[#f0f7ff] hover:bg-[#e2e8f0] text-[#0f172a] font-bold rounded-full text-xs border border-[#cbd5e1]">
                Tutup
              </button>
              {!resetMsg && (
                <button
                  onClick={handleReset}
                  disabled={resetSubmitting}
                  className="flex-2 py-3 bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white font-extrabold rounded-full text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
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
  'w-full px-3.5 py-2.5 text-xs bg-[#f0f7ff] border border-[#cbd5e1] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#8b5cf6] font-medium text-[#0f172a] transition-all';

function ModalShell({ title, subtitle, accent, onClose, children }: { title: string; subtitle?: string; accent: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden border border-[#e2e8f0] flex flex-col max-h-[90vh]">
        <div className={`${accent} text-white p-4 flex items-center justify-between`}>
          <div>
            <h2 className="font-extrabold text-sm">{title}</h2>
            {subtitle && <p className="text-[11px] text-white/80">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/80">
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
      <label className="block text-xs font-bold text-[#0f172a] mb-1">
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
    <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded-2xl text-xs text-[#10b981] font-bold flex items-center gap-2">
      <Check className="w-4 h-4 shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

function SummaryCell({ label, value, tone = 'normal' }: { label: string; value: number; tone?: 'normal' | 'ok' | 'warn' }) {
  const color = tone === 'ok' ? 'text-[#047857]' : tone === 'warn' ? 'text-[#b45309]' : 'text-[#0f172a]';
  return (
    <div className="bg-[#f0f7ff] rounded-2xl p-3 border border-[#e2e8f0]">
      <p className={`text-lg font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-[#64748b] font-bold mt-0.5">{label}</p>
    </div>
  );
}
