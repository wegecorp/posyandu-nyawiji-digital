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
  RefreshCw,
  ShieldCheck,
  Info,
} from 'lucide-react';

const inputCls =
  'w-full px-3.5 py-2.5 text-xs bg-[#f0f7ff] border border-[#cbd5e1] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#0284c7] font-medium text-[#0f172a] transition-all';

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
  padukuhan: string;
  users?: { id: string; username: string; mustChangePassword: boolean }[];
  _count?: { patients: number; measurements: number };
}

export const PuskesmasDashboard: React.FC<PuskesmasDashboardProps> = ({ onEnterPosyandu, onExport }) => {
  const { user } = useAuth();
  const [posyandus, setPosyandus] = useState<PosyanduRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const renderFormNotice = () => (
    <div className="p-3 bg-[#f0f7ff] rounded-2xl border border-[#cbd5e1] text-[11px] text-[#0f172a] font-medium flex gap-2">
      <Info className="w-4 h-4 shrink-0 text-[#0284c7]" />
      <p>
        Akun baru memakai <strong>password default</strong> dan wajib diganti kader saat login pertama.
        Kader login dengan memilih Puskesmas → Kalurahan → Posyandu (tanpa username).
      </p>
    </div>
  );

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-20">
      {/* Profile header */}
      <div className="bg-[#0f172a] text-white rounded-[28px] p-6 shadow-md space-y-4 border border-[#e2e8f0]/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-full">
              <Building2 className="w-6 h-6 text-[#38bdf8]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#0284c7] px-2.5 py-0.5 rounded-full text-white">
                Akun Puskesmas
              </span>
              <h1 className="text-lg font-black leading-tight mt-1">{user?.name}</h1>
              {user?.kapanewon && <p className="text-xs text-[#cbd5e1]">Kapanewon {user.kapanewon}</p>}
            </div>
          </div>
        </div>
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <span>
            Total Posyandu Binaan: <strong className="text-white">{posyandus.length} Unit</strong>
          </span>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all touch-press"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Rekap Wilayah</span>
          </button>
        </div>
      </div>

      {/* Action header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-[#0f172a]">Akun Posyandu Binaan</h2>
          <p className="text-xs text-[#64748b]">1 akun per posyandu — dikelola Puskesmas</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold px-4 py-2 rounded-full text-xs shadow-xs transition-all touch-press"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Daftarkan Posyandu</span>
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center gap-2 text-xs font-bold text-[#64748b]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#0284c7]" />
          Memuat posyandu binaan...
        </div>
      ) : posyandus.length === 0 ? (
        <div className="bg-white rounded-[24px] p-8 border border-[#e2e8f0] text-center space-y-2 shadow-xs">
          <p className="text-xs text-[#64748b]">Belum ada akun Posyandu di bawah Puskesmas ini.</p>
          <button onClick={openCreate} className="text-xs text-[#0284c7] font-bold hover:underline">
            + Daftarkan Posyandu Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posyandus.map((pos) => {
            const userRow = pos.users?.[0];
            const pending = !!userRow?.mustChangePassword;
            return (
              <div
                key={pos.id}
                className="bg-white rounded-[20px] p-4 border border-[#e2e8f0] shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm text-[#0f172a]">{pos.name}</h3>
                      <span className="font-mono text-[10px] bg-[#f0f7ff] text-[#0f172a] px-2 py-0.5 rounded-md font-bold border border-[#e2e8f0]">
                        {pos.code}
                      </span>
                      {pending ? (
                        <span className="text-[10px] font-bold bg-[#f59e0b]/15 text-[#b45309] border border-[#f59e0b]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Menunggu aktivasi
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-[#10b981]/10 text-[#047857] border border-[#10b981]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Aktif
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#64748b] mt-1 font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {pos.padukuhan && pos.padukuhan !== '-' ? `Padukuhan ${pos.padukuhan}, ` : ''}Kalurahan {pos.kalurahan}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(pos)}
                      className="p-2.5 bg-[#f0f7ff] hover:bg-[#e2e8f0] text-[#0284c7] border border-[#cbd5e1] rounded-full transition-all touch-press"
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
                        className="p-2.5 bg-[#f0f7ff] hover:bg-[#e2e8f0] text-[#0284c7] border border-[#cbd5e1] rounded-full transition-all touch-press"
                        title="Reset password akun posyandu"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onEnterPosyandu(pos.id, pos.name, pos.code)}
                      className="py-2.5 px-4 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 touch-press"
                    >
                      <span>Buka Meja</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 text-xs text-[#64748b] pt-2 border-t border-[#eef2f6]">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#0284c7]" />
                    <strong className="text-[#0f172a]">{pos._count?.patients || 0}</strong> Pasien
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#10b981]" />
                    <strong className="text-[#0f172a]">{pos._count?.measurements || 0}</strong> Pengukuran
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Daftarkan Posyandu */}
      {isCreateOpen && (
        <ModalShell title="Daftarkan Posyandu Baru" subtitle={`Di bawah ${user?.name}`} accent="bg-[#0284c7]" onClose={() => setIsCreateOpen(false)}>
          <form onSubmit={handleCreate} className="p-5 space-y-3.5">
            {errorMsg && <BannerError msg={errorMsg} />}
            {myKalurahan.length === 0 && (
              <div className="p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/40 rounded-2xl text-xs text-[#111b21] font-bold flex items-center gap-2">
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
              <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-[#f0f7ff] hover:bg-[#e2e8f0] text-[#0f172a] font-bold rounded-full text-xs border border-[#cbd5e1]">
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || myKalurahan.length === 0}
                className="flex-2 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-full text-xs shadow-xs transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Mendaftarkan...' : 'Simpan & Terbitkan Akun'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Ubah Posyandu */}
      {editTarget && (
        <ModalShell title="Ubah Posyandu" subtitle={`${editTarget.name} · ${editTarget.code}`} accent="bg-[#0284c7]" onClose={() => setEditTarget(null)}>
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
            <p className="text-[11px] text-[#64748b] font-medium">
              Kode posyandu tidak berubah. Nama boleh sama dengan posyandu lain — identitas memakai kode unik.
            </p>
            <div className="pt-2 flex gap-2.5">
              <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-3 bg-[#f0f7ff] hover:bg-[#e2e8f0] text-[#0f172a] font-bold rounded-full text-xs border border-[#cbd5e1]">
                Batal
              </button>
              <button type="submit" disabled={isSubmitting} className="flex-2 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-full text-xs shadow-xs transition-all disabled:opacity-50">
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Reset Password */}
      {resetTarget && (
        <ModalShell title="Reset Password Akun" subtitle={resetTarget.name} accent="bg-[#0f172a]" onClose={() => setResetTarget(null)}>
          <div className="p-5 space-y-4">
            {resetMsg?.type === 'ok' && <BannerOk msg={resetMsg.text} />}
            {resetMsg?.type === 'err' && <BannerError msg={resetMsg.text} />}
            {!resetMsg && (
              <div className="p-3 bg-[#f0f7ff] rounded-2xl border border-[#cbd5e1] text-xs text-[#0f172a] font-medium flex gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#0284c7]" />
                <p>
                  Password akun ini dikembalikan ke <strong>password default</strong>. Kader wajib
                  menggantinya saat login pertama berikutnya (aktivasi ulang). Tidak perlu mengetik
                  password baru di sini.
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
                  className="flex-2 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold rounded-full text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
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
