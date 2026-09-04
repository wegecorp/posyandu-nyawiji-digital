'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Building,
  PlusCircle,
  Users,
  Activity,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Building2,
  X,
  Lock,
  AlertTriangle,
} from 'lucide-react';

interface DinkesDashboardProps {
  onExportAll: () => void;
  onEnterPosyandu: (posyanduId: string, posyanduName: string, posyanduCode: string) => void;
}

export const DinkesDashboard: React.FC<DinkesDashboardProps> = ({
  onExportAll,
  onEnterPosyandu,
}) => {
  const { user } = useAuth();
  const [puskesmasList, setPuskesmasList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Puskesmas Form
  const [pkmName, setPkmName] = useState('');
  const [kapanewon, setKapanewon] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPuskesmas = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dinkes/puskesmas');
      const data = await res.json();
      if (data.success) {
        setPuskesmasList(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPuskesmas();
  }, []);

  const handleCreatePuskesmas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkmName.trim() || !kapanewon.trim() || !username.trim() || !password.trim()) {
      setErrorMsg('Semua kolom wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/dinkes/puskesmas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pkmName.trim(),
          kapanewon: kapanewon.trim(),
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat akun puskesmas');
      }

      setPkmName('');
      setKapanewon('');
      setUsername('');
      setPassword('password123');
      setIsCreateModalOpen(false);
      fetchPuskesmas();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPosyandu = puskesmasList.reduce((acc, p) => acc + (p.posyandus?.length || 0), 0);

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-20">
      {/* Dinkes Banner (DESIGN.md Hero Card Pattern) */}
      <div className="bg-[#0f172a] text-white rounded-[28px] p-6 shadow-md space-y-4 border border-[#e2e8f0]/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-full">
              <Building className="w-6 h-6 text-[#8b5cf6]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#8b5cf6] px-2.5 py-0.5 rounded-full text-white">
                Pusat Kontrol Dinas Kesehatan
              </span>
              <h1 className="text-lg font-black leading-tight mt-1">Dinas Kesehatan Gunungkidul</h1>
              <p className="text-xs text-[#cbd5e1]">Pembuat & Pengelola Seluruh Puskesmas & Posyandu GK</p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <span>
            Puskesmas: <strong className="text-white">{puskesmasList.length}</strong> • Total Posyandu: <strong className="text-white">{totalPosyandu}</strong>
          </span>
          <button
            onClick={onExportAll}
            className="flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all touch-press"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Se-Kabupaten</span>
          </button>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-[#0f172a]">Daftar Akun Puskesmas</h2>
          <p className="text-xs text-[#64748b]">Masing-masing Puskesmas memegang 1 akun & password</p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white font-bold px-4 py-2 rounded-full text-xs shadow-xs transition-all touch-press"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Daftarkan Puskesmas</span>
        </button>
      </div>

      {/* Puskesmas List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#64748b]">Memuat data Puskesmas...</div>
      ) : (
        <div className="space-y-3">
          {puskesmasList.map((pkm) => (
            <div
              key={pkm.id}
              className="bg-white rounded-[20px] p-4.5 border border-[#e2e8f0] shadow-xs space-y-3.5 hover:border-[#cbd5e1] transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-[#0f172a]">{pkm.name}</h3>
                    <span className="font-mono text-[10px] bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 px-2 py-0.5 rounded-full font-bold">
                      {pkm.code}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748b] font-medium mt-0.5">Kapanewon {pkm.kapanewon}</p>
                </div>

                {pkm.users?.[0]?.username && (
                  <span className="text-[11px] font-mono bg-[#f0f7ff] text-[#0f172a] px-2.5 py-1 rounded-full border border-[#e2e8f0]">
                    user: <strong>{pkm.users[0].username}</strong>
                  </span>
                )}
              </div>

              {/* Posyandu sub-units */}
              <div className="bg-[#f0f7ff] p-3.5 rounded-2xl border border-[#e2e8f0] space-y-2">
                <span className="text-[11px] font-bold text-[#0f172a]">
                  Unit Posyandu Terdaftar ({pkm.posyandus?.length || 0}):
                </span>

                <div className="flex flex-wrap gap-2">
                  {pkm.posyandus?.map((pos: any) => (
                    <button
                      key={pos.id}
                      onClick={() => onEnterPosyandu(pos.id, pos.name, pos.code)}
                      className="px-3 py-1 bg-white hover:bg-[#0284c7] text-[#0f172a] hover:text-white border border-[#cbd5e1] rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      <span>{pos.name}</span>
                      <ArrowRight className="w-3 h-3 text-[#94a3b8]" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Puskesmas Account */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden border border-[#e2e8f0] flex flex-col">
            <div className="bg-[#0f172a] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-5 h-5 text-[#8b5cf6]" />
                <div>
                  <h2 className="font-extrabold text-sm">Pendaftaran Akun Puskesmas Baru</h2>
                  <p className="text-[11px] text-[#cbd5e1]">Dinas Kesehatan Kabupaten Gunungkidul</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePuskesmas} className="p-5 space-y-3.5">
              {errorMsg && (
                <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#ef4444] font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#0f172a] mb-1">
                  Nama Puskesmas <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="text"
                  value={pkmName}
                  onChange={(e) => setPkmName(e.target.value)}
                  placeholder="Contoh: Puskesmas Semanu I"
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-[#f0f7ff] border border-[#cbd5e1] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#0284c7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f172a] mb-1">
                  Kapanewon / Kecamatan <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="text"
                  value={kapanewon}
                  onChange={(e) => setKapanewon(e.target.value)}
                  placeholder="Contoh: Semanu"
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-[#f0f7ff] border border-[#cbd5e1] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#0284c7]"
                />
              </div>

              <div className="pt-2 border-t border-[#e2e8f0] space-y-2.5">
                <span className="text-[11px] font-bold text-[#8b5cf6] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#8b5cf6]" />
                  <span>Kredensial Akun Institusi Puskesmas (1 Akun 1 Password):</span>
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] mb-0.5">
                    Username Akun Puskesmas <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: pkm_semanu1"
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-[#f0f7ff] border border-[#cbd5e1] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#0284c7] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] mb-0.5">
                    Password Akun Puskesmas <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-[#f0f7ff] border border-[#cbd5e1] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#0284c7] font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-3 bg-[#f0f7ff] hover:bg-[#e2e8f0] text-[#0f172a] font-bold rounded-full text-xs border border-[#cbd5e1]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-2 py-3 bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white font-bold rounded-full text-xs shadow-xs transition-all"
                >
                  {isSubmitting ? 'Mendaftarkan...' : 'Simpan & Terbitkan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

