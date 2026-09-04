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
  ShieldCheck,
  Check,
  X,
  Lock,
  Key,
  AlertTriangle,
} from 'lucide-react';

interface PuskesmasDashboardProps {
  onEnterPosyandu: (posyanduId: string, posyanduName: string, posyanduCode: string) => void;
  onExport: () => void;
}

export const PuskesmasDashboard: React.FC<PuskesmasDashboardProps> = ({
  onEnterPosyandu,
  onExport,
}) => {
  const { user } = useAuth();
  const [posyandus, setPosyandus] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Posyandu Account Form
  const [posName, setPosName] = useState('');
  const [kalurahan, setKalurahan] = useState('');
  const [padukuhan, setPadukuhan] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPosyandus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/posyandus?healthCenterId=${user?.healthCenterId || ''}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setPosyandus(data.data[0].posyandus || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosyandus();
  }, [user?.healthCenterId]);

  const handleCreatePosyanduAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posName.trim() || !username.trim() || !password.trim()) {
      setErrorMsg('Semua kolom wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/posyandus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: posName.trim(),
          kalurahan: kalurahan.trim(),
          padukuhan: padukuhan.trim(),
          healthCenterId: user?.healthCenterId,
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat akun posyandu');
      }

      // Reset and refresh
      setPosName('');
      setKalurahan('');
      setPadukuhan('');
      setUsername('');
      setPassword('password123');
      setIsCreateModalOpen(false);
      fetchPosyandus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-20">
      {/* Puskesmas Profile Header Card (DESIGN.md Hero Card Pattern) */}
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
              <p className="text-xs text-[#cbd5e1]">Wilayah Pembinaan Kapanewon Gunungkidul</p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <span>Total Posyandu Binaan: <strong className="text-white">{posyandus.length} Unit</strong></span>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all touch-press"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Rekap Wilayah</span>
          </button>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-[#0f172a]">Daftar Akun Posyandu Binaan</h2>
          <p className="text-xs text-[#64748b]">Kader menggunakan 1 akun & password per Posyandu</p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold px-4 py-2 rounded-full text-xs shadow-xs transition-all touch-press"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Buat Akun Posyandu</span>
        </button>
      </div>

      {/* Posyandu List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#64748b]">Memuat posyandu binaan...</div>
      ) : posyandus.length === 0 ? (
        <div className="bg-white rounded-[24px] p-8 border border-[#e2e8f0] text-center space-y-2 shadow-xs">
          <p className="text-xs text-[#64748b]">Belum ada akun Posyandu di bawah Puskesmas ini.</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs text-[#0284c7] font-bold hover:underline"
          >
            + Buat Akun Posyandu Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posyandus.map((pos) => (
            <div
              key={pos.id}
              className="bg-white rounded-[20px] p-4.5 border border-[#e2e8f0] shadow-xs flex items-center justify-between gap-3 hover:border-[#cbd5e1] transition-all"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-[#0f172a] truncate">{pos.name}</h3>
                  <span className="font-mono text-[10px] bg-[#f0f7ff] text-[#0f172a] px-2 py-0.5 rounded-md font-bold border border-[#e2e8f0]">
                    {pos.code}
                  </span>
                </div>

                <div className="text-xs text-[#64748b] mt-1 font-medium">
                  Padukuhan {pos.padukuhan}, Kalurahan {pos.kalurahan}
                </div>

                <div className="mt-2.5 flex items-center gap-3.5 text-xs text-[#64748b]">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#0284c7]" />
                    <strong className="text-[#0f172a]">{pos._count?.patients || 0}</strong> Pasien
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#10b981]" />
                    <strong className="text-[#0f172a]">{pos._count?.measurements || 0}</strong> Pengukuran
                  </span>
                  {pos.users?.[0]?.username && (
                    <span className="text-[11px] text-[#94a3b8] font-mono">
                      (user: {pos.users[0].username})
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => onEnterPosyandu(pos.id, pos.name, pos.code)}
                className="py-2.5 px-4 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 touch-press shrink-0"
              >
                <span>Buka Meja</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Posyandu Account */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden border border-[#e2e8f0] flex flex-col">
            <div className="bg-[#0f172a] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-5 h-5 text-[#38bdf8]" />
                <div>
                  <h2 className="font-extrabold text-sm">Pendaftaran Akun Posyandu Baru</h2>
                  <p className="text-[11px] text-[#cbd5e1]">Di bawah {user?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePosyanduAccount} className="p-5 space-y-3.5">
              {errorMsg && (
                <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#ef4444] font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#0f172a] mb-1">
                  Nama Posyandu <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="text"
                  value={posName}
                  onChange={(e) => setPosName(e.target.value)}
                  placeholder="Contoh: Posyandu Melati"
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-[#f0f7ff] border border-[#cbd5e1] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#0284c7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#0f172a] mb-1">Kalurahan</label>
                  <input
                    type="text"
                    value={kalurahan}
                    onChange={(e) => setKalurahan(e.target.value)}
                    placeholder="Wonosari"
                    className="w-full px-3.5 py-2 text-xs bg-[#f0f7ff] border border-[#cbd5e1] rounded-xl outline-none focus:bg-white focus:border-2 focus:border-[#0284c7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0f172a] mb-1">Padukuhan</label>
                  <input
                    type="text"
                    value={padukuhan}
                    onChange={(e) => setPadukuhan(e.target.value)}
                    placeholder="Purbosari"
                    className="w-full px-3.5 py-2 text-xs bg-[#f0f7ff] border border-[#cbd5e1] rounded-xl outline-none focus:bg-white focus:border-2 focus:border-[#0284c7]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#e2e8f0] space-y-2.5">
                <span className="text-[11px] font-bold text-[#0284c7] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#0284c7]" />
                  <span>Kredensial Akun Posyandu (1 Akun 1 Password):</span>
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] mb-0.5">
                    Username Akun Posyandu <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: pos_melati"
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-[#f0f7ff] border border-[#cbd5e1] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#0284c7] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] mb-0.5">
                    Password Akun Posyandu <span className="text-[#ef4444]">*</span>
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
                  className="flex-2 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-full text-xs shadow-xs transition-all"
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

