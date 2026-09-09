'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Lock,
  User,
  Key,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Building2,
  Eye,
  EyeOff,
  CheckCircle2,
  MapPin,
  Home,
  RefreshCw,
  ShieldCheck,
  Info,
} from 'lucide-react';

type LoginTab = 'posyandu' | 'staf';
type CascadeStep = 0 | 1 | 2 | 3; // 0:puskesmas 1:kalurahan 2:posyandu 3:password

interface Identity {
  mode: 'posyandu' | 'staff';
  username?: string;
  posyanduId?: string | null;
  label: string;
}

interface PuskesmasItem { id: string; code: string; name: string; kapanewon: string }
interface KalurahanItem { id: string; name: string; posyanduCount: number }
interface PosyanduItem { id: string; code: string; name: string; padukuhan: string }

function getErrMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Terjadi kesalahan';
}

export function AuthPage() {
  const { login } = useAuth();

  const [tab, setTab] = useState<LoginTab>('posyandu');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Cascade Posyandu ---
  const [step, setStep] = useState<CascadeStep>(0);
  const [puskesmasList, setPuskesmasList] = useState<PuskesmasItem[]>([]);
  const [kalurahanList, setKalurahanList] = useState<KalurahanItem[]>([]);
  const [posyanduList, setPosyanduList] = useState<PosyanduItem[]>([]);
  const [selectedPuskesmas, setSelectedPuskesmas] = useState<PuskesmasItem | null>(null);
  const [selectedKalurahan, setSelectedKalurahan] = useState<KalurahanItem | null>(null);
  const [selectedPosyandu, setSelectedPosyandu] = useState<PosyanduItem | null>(null);
  const [kaderPassword, setKaderPassword] = useState('');
  const [filterText, setFilterText] = useState('');

  // --- Staf ---
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // --- Aktivasi akun baru ---
  const [activation, setActivation] = useState<{ identity: Identity; currentPassword: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activationMsg, setActivationMsg] = useState('');

  // Ambil daftar puskesmas saat tab posyandu aktif di step awal
  useEffect(() => {
    if (tab === 'posyandu' && step === 0 && puskesmasList.length === 0) {
      fetch('/api/public/puskesmas')
        .then((r) => r.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) setPuskesmasList(json.data);
        })
        .catch((e) => console.error('Gagal memuat puskesmas:', e));
    }
  }, [tab, step, puskesmasList.length]);

  const resetCascade = () => {
    setStep(0);
    setSelectedPuskesmas(null);
    setSelectedKalurahan(null);
    setSelectedPosyandu(null);
    setKalurahanList([]);
    setPosyanduList([]);
    setKaderPassword('');
    setFilterText('');
  };

  const switchTab = (next: LoginTab) => {
    setTab(next);
    setErrorMsg('');
    setFilterText('');
    if (next === 'posyandu') resetCascade();
    else {
      setStaffUsername('');
      setStaffPassword('');
    }
  };

  // Langkah 1: pilih puskesmas -> ambil kalurahan
  const choosePuskesmas = async (pkm: PuskesmasItem) => {
    setSelectedPuskesmas(pkm);
    setErrorMsg('');
    setIsLoading(true);
    setKalurahanList([]);
    setPosyanduList([]);
    setFilterText('');
    try {
      const res = await fetch(`/api/public/puskesmas/${pkm.id}/kalurahan`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat kalurahan');
      setKalurahanList(json.data);
      setStep(1);
    } catch (err) {
      setErrorMsg(getErrMsg(err));
      setSelectedPuskesmas(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Langkah 2: pilih kalurahan -> ambil posyandu
  const chooseKalurahan = async (kal: KalurahanItem) => {
    if (!selectedPuskesmas) return;
    setSelectedKalurahan(kal);
    setErrorMsg('');
    setIsLoading(true);
    setPosyanduList([]);
    setFilterText('');
    try {
      const res = await fetch(`/api/public/puskesmas/${selectedPuskesmas.id}/posyandu?kalurahanId=${kal.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memuat posyandu');
      setPosyanduList(json.data);
      setStep(2);
    } catch (err) {
      setErrorMsg(getErrMsg(err));
      setSelectedKalurahan(null);
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setErrorMsg('');
    setFilterText('');
    if (step === 1) {
      resetCascade();
    } else if (step === 2) {
      setStep(1);
      setSelectedKalurahan(null);
      setPosyanduList([]);
    } else if (step === 3) {
      setStep(2);
      setSelectedPosyandu(null);
      setKaderPassword('');
    }
  };

  const submitPosyanduLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosyandu || !kaderPassword.trim()) {
      setErrorMsg('Pilih posyandu dan isi password');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'posyandu', posyanduId: selectedPosyandu.id, password: kaderPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Login gagal');
      if (json.needsActivation) {
        setActivation({
          identity: json.identity,
          currentPassword: kaderPassword,
        });
        return;
      }
      login(json.user);
    } catch (err) {
      setErrorMsg(getErrMsg(err));
    } finally {
      setIsLoading(false);
    }
  };

  const submitStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffUsername.trim() || !staffPassword.trim()) {
      setErrorMsg('Username dan password wajib diisi');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'staff', username: staffUsername, password: staffPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Login gagal');
      if (json.needsActivation) {
        setActivation({
          identity: json.identity,
          currentPassword: staffPassword,
        });
        return;
      }
      login(json.user);
    } catch (err) {
      setErrorMsg(getErrMsg(err));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Aktivasi: ganti password default -> password pribadi ---
  const submitActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activation) return;
    if (newPassword.trim().length < 8) {
      setActivationMsg('Password baru minimal 8 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      setActivationMsg('Konfirmasi password tidak cocok');
      return;
    }
    setIsLoading(true);
    setActivationMsg('');
    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: activation.identity.mode,
          username: activation.identity.username,
          posyanduId: activation.identity.posyanduId,
          currentPassword: activation.currentPassword,
          newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Aktivasi gagal');
      login(json.user);
    } catch (err) {
      setActivationMsg(getErrMsg(err));
    } finally {
      setIsLoading(false);
    }
  };

  const q = filterText.toLowerCase().trim();
  const shownPuskesmas = q
    ? puskesmasList.filter((p) => p.name.toLowerCase().includes(q) || p.kapanewon.toLowerCase().includes(q))
    : puskesmasList;
  const shownKalurahan = q ? kalurahanList.filter((k) => k.name.toLowerCase().includes(q)) : kalurahanList;
  const shownPosyandu = q
    ? posyanduList.filter((p) => p.name.toLowerCase().includes(q) || (p.padukuhan || '').toLowerCase().includes(q))
    : posyanduList;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f0f2f5] text-[#111b21]">
      {/* Branding */}
      <div className="text-center mb-5 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex justify-center mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-192.png"
            alt="Logo POSYANDU NYAWIJI"
            className="w-16 h-16 rounded-2xl shadow-md border-2 border-white object-cover"
          />
        </div>
        <h1 className="text-2xl font-black text-[#075e54] tracking-tight">POSYANDU NYAWIJI</h1>
        <p className="text-sm text-[#54656f] font-bold">Kabupaten Gunungkidul — D.I. Yogyakarta</p>
      </div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white rounded-3xl shadow-xl border border-[#e9edef] overflow-hidden">

          {/* ====== AKTIVASI AKUN BARU ====== */}
          {activation ? (
            <form onSubmit={submitActivation} className="p-5 space-y-4">
              <div className="bg-[#075e54] -mx-5 -mt-5 px-5 py-4 text-white mb-1">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-full">
                    <ShieldCheck className="w-5 h-5 text-[#25d366]" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-white text-lg leading-tight">Aktivasi Akun</h2>
                    <p className="text-xs text-white/80 mt-0.5">Satu langkah lagi — buat password pribadi</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-[#e7fceb] border border-[#25d366]/30 rounded-2xl text-xs text-[#075e54] space-y-1">
                <p className="font-black">Halo, {activation.identity.label}</p>
                <p className="font-medium text-[#075e54]/90">
                  Akun kamu masih memakai password default. Ganti dengan password pribadi sebelum memakai aplikasi.
                </p>
              </div>

              {activationMsg && (
                <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#ef4444] font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
                  <span>{activationMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#111b21] mb-1.5">Password Baru</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-3 text-[#8696a0] hover:text-[#111b21]">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111b21] mb-1.5">Konfirmasi Password Baru</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    autoComplete="new-password"
                    required
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-sm shadow-md transition-all flex items-center justify-center gap-2 touch-press disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{isLoading ? 'Mengaktifkan...' : 'Aktifkan & Masuk'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivation(null);
                  setNewPassword('');
                  setConfirmPassword('');
                  setActivationMsg('');
                  setErrorMsg('');
                  resetCascade();
                }}
                className="w-full py-2 text-xs text-[#54656f] font-bold hover:text-[#111b21] transition-all flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Mulai ulang login</span>
              </button>
            </form>
          ) : (
            <>
              {/* Tab pemilih jenis login */}
              <div className="p-3 bg-[#f0f2f5] border-b border-[#e9edef]">
                <div className="flex bg-white p-1 rounded-2xl border border-[#e9edef] text-xs font-bold shadow-xs">
                  <button
                    type="button"
                    onClick={() => switchTab('posyandu')}
                    className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      tab === 'posyandu' ? 'bg-[#075e54] text-white shadow-sm' : 'text-[#54656f] hover:text-[#111b21]'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Kader Posyandu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('staf')}
                    className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      tab === 'staf' ? 'bg-[#128c7e] text-white shadow-sm' : 'text-[#54656f] hover:text-[#111b21]'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Puskesmas / Dinkes</span>
                  </button>
                </div>
              </div>

              {/* ====== LOGIN KADER (CASCADE) ====== */}
              {tab === 'posyandu' && step === 0 && (
                <div className="max-h-[68vh] overflow-y-auto">
                  <div className="bg-[#075e54] text-white p-5">
                    <h2 className="font-extrabold text-white text-lg leading-tight">Masuk Akun Posyandu</h2>
                    <p className="text-xs text-white/80 mt-0.5 font-medium">Pilih lokasi posyandu Anda</p>
                  </div>
                  {errorMsg && <ErrorBanner msg={errorMsg} />}
                  <div className="p-3 space-y-2">
                    {isLoading ? (
                      <div className="p-10 flex flex-col items-center gap-2 text-xs font-bold text-[#54656f]">
                        <RefreshCw className="w-5 h-5 animate-spin text-[#075e54]" />
                        Memuat daftar puskesmas...
                      </div>
                    ) : puskesmasList.length === 0 ? (
                      <EmptyState msg="Belum ada Puskesmas terdaftar. Hubungi Dinas Kesehatan untuk pembuatan akun." />
                    ) : (
                      <>
                        <StepFilter value={filterText} onChange={setFilterText} placeholder="Cari puskesmas / kapanewon..." />
                        {shownPuskesmas.map((pkm) => (
                          <SelectableCard
                            key={pkm.id}
                            title={pkm.name}
                            subtitle={`Kapanewon ${pkm.kapanewon}`}
                            icon={<Building2 className="w-4 h-4" />}
                            onClick={() => choosePuskesmas(pkm)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {tab === 'posyandu' && step === 1 && (
                <div className="max-h-[68vh] overflow-y-auto">
                  <StepHeader
                    title={`Pilih Kalurahan`}
                    subtitle={selectedPuskesmas ? `${selectedPuskesmas.name} — Kapanewon ${selectedPuskesmas.kapanewon}` : ''}
                    onBack={goBack}
                  />
                  {errorMsg && <ErrorBanner msg={errorMsg} />}
                  <div className="p-3 space-y-2">
                    {kalurahanList.length === 0 ? (
                      <EmptyState msg="Belum ada posyandu terdaftar di puskesmas ini." />
                    ) : (
                      <>
                        <StepFilter value={filterText} onChange={setFilterText} placeholder="Cari kalurahan..." />
                        {shownKalurahan.map((kal) => (
                          <SelectableCard
                            key={kal.id}
                            title={kal.name}
                            subtitle={`${kal.posyanduCount} posyandu`}
                            icon={<MapPin className="w-4 h-4" />}
                            onClick={() => chooseKalurahan(kal)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {tab === 'posyandu' && step === 2 && (
                <div className="max-h-[68vh] overflow-y-auto">
                  <StepHeader
                    title={`Pilih Posyandu`}
                    subtitle={selectedKalurahan ? `Kalurahan ${selectedKalurahan.name}` : ''}
                    onBack={goBack}
                  />
                  {errorMsg && <ErrorBanner msg={errorMsg} />}
                  <div className="p-3 space-y-2">
                    {posyanduList.length === 0 ? (
                      <EmptyState msg="Belum ada posyandu di kalurahan ini." />
                    ) : (
                      <>
                        <StepFilter value={filterText} onChange={setFilterText} placeholder="Cari nama posyandu..." />
                        {shownPosyandu.map((pos) => (
                          <SelectableCard
                            key={pos.id}
                            title={pos.name}
                            subtitle={`${pos.padukuhan && pos.padukuhan !== '-' ? `Padukuhan ${pos.padukuhan} · ` : ''}Kalurahan ${selectedKalurahan?.name || ''}`}
                            icon={<Home className="w-4 h-4" />}
                            selected={selectedPosyandu?.id === pos.id}
                            onClick={() => {
                              setSelectedPosyandu(pos);
                              setKaderPassword('');
                              setErrorMsg('');
                              setStep(3);
                            }}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {tab === 'posyandu' && step === 3 && selectedPosyandu && (
                <form onSubmit={submitPosyanduLogin} className="p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#128c7e]">
                    <button type="button" onClick={goBack} className="flex items-center gap-1 hover:text-[#075e54] transition-colors">
                      <ArrowLeft className="w-3.5 h-3.5" /> Ubah posyandu
                    </button>
                  </div>
                  <div className="p-3.5 bg-[#f0f2f5] rounded-2xl border border-[#e9edef]">
                    <p className="text-[11px] font-bold text-[#128c7e] uppercase tracking-wider">Akun Posyandu</p>
                    <p className="font-black text-[#111b21] text-base mt-1">{selectedPosyandu.name}</p>
                    <p className="text-xs text-[#54656f] font-medium mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedKalurahan?.name}
                      {selectedPosyandu.padukuhan && selectedPosyandu.padukuhan !== '-' ? ` · ${selectedPosyandu.padukuhan}` : ''}
                    </p>
                  </div>
                  {errorMsg && <ErrorBanner msg={errorMsg} />}
                  <div>
                    <label className="block text-xs font-bold text-[#111b21] mb-1.5">Password</label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={kaderPassword}
                        onChange={(e) => setKaderPassword(e.target.value)}
                        placeholder="Masukkan password"
                        autoComplete="current-password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-3 text-[#8696a0] hover:text-[#111b21]">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !kaderPassword.trim()}
                    className="w-full py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-sm shadow-md transition-all flex items-center justify-center gap-2 touch-press disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>{isLoading ? 'Memverifikasi...' : 'Masuk'}</span>
                  </button>
                </form>
              )}

              {/* ====== LOGIN STAF ====== */}
              {tab === 'staf' && (
                <form onSubmit={submitStaffLogin} className="p-5 space-y-4">
                  <div className="bg-[#128c7e] -mx-5 -mt-5 px-5 py-4 text-white mb-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/10 rounded-full">
                        <Building2 className="w-5 h-5 text-[#25d366]" />
                      </div>
                      <div>
                        <h2 className="font-extrabold text-white text-lg leading-tight">Login Staf</h2>
                        <p className="text-xs text-white/80 mt-0.5">Puskesmas / Dinas Kesehatan</p>
                      </div>
                    </div>
                  </div>

                  {errorMsg && <ErrorBanner msg={errorMsg} />}

                  <div>
                    <label className="block text-xs font-bold text-[#111b21] mb-1.5">Username</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={staffUsername}
                        onChange={(e) => setStaffUsername(e.target.value)}
                        placeholder="Username akun staf"
                        autoComplete="username"
                        required
                        className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111b21] mb-1.5">Password</label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder="Password"
                        autoComplete="current-password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-3 text-[#8696a0] hover:text-[#111b21]">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-sm shadow-md transition-all flex items-center justify-center gap-2 touch-press disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>{isLoading ? 'Memverifikasi...' : 'Masuk'}</span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Catatan kebijakan akun */}
        <div className="mt-4 p-3.5 bg-white/70 border border-[#e9edef] rounded-2xl text-[11px] text-[#54656f] leading-relaxed font-medium flex gap-2.5">
          <Info className="w-4 h-4 shrink-0 text-[#128c7e] mt-0.5" />
          <p>
            Akun dibuat oleh jenjang di atasnya (Posyandu oleh Puskesmas, Puskesmas oleh Dinas Kesehatan).
            Akun baru memakai password default dan <strong>wajib diganti saat pertama masuk</strong>.
          </p>
        </div>

        <div className="text-center mt-4 text-xs text-[#54656f]">
          <p>© 2026 POSYANDU NYAWIJI — Dinas Kesehatan Kab. Gunungkidul</p>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="mx-5 mt-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#ef4444] font-bold flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
      <span>{msg}</span>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="p-6 text-center">
      <div className="w-12 h-12 bg-[#f0f2f5] text-[#8696a0] rounded-full flex items-center justify-center mx-auto mb-2">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <p className="text-xs text-[#54656f] font-bold">{msg}</p>
    </div>
  );
}

function StepFilter({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all"
    />
  );
}

function StepHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div className="bg-[#075e54] text-white p-5">
      <button type="button" onClick={onBack} className="text-xs font-bold text-white/80 hover:text-white transition-colors flex items-center gap-1 mb-1.5">
        <ArrowLeft className="w-3.5 h-3.5" /> Kembali
      </button>
      <h2 className="font-extrabold text-white text-lg leading-tight">{title}</h2>
      {subtitle && <p className="text-xs text-white/80 mt-0.5 font-medium">{subtitle}</p>}
    </div>
  );
}

function SelectableCard({
  title,
  subtitle,
  icon,
  onClick,
  selected,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-3.5 bg-white hover:bg-[#f0f2f5] border-2 rounded-2xl text-left transition-all touch-press shadow-xs flex items-center gap-3 ${
        selected ? 'border-[#128c7e]' : 'border-[#e9edef] hover:border-[#128c7e]'
      }`}
    >
      <div className={`p-2.5 rounded-full shrink-0 ${selected ? 'bg-[#128c7e] text-white' : 'bg-[#f0f2f5] text-[#075e54]'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-[#111b21] text-sm truncate">{title}</h3>
        {subtitle && <p className="text-[11px] text-[#54656f] font-medium mt-0.5 truncate">{subtitle}</p>}
      </div>
      <ArrowRight className="w-4 h-4 text-[#8696a0] shrink-0" />
    </button>
  );
}
