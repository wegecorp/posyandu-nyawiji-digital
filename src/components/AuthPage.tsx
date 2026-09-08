'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Lock,
  User,
  Key,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Building2,
  Building,
  PlusCircle,
  Eye,
  EyeOff,
  ChevronDown,
  CheckCircle2,
  Stethoscope,
  Landmark,
  Hospital,
  Sprout,
} from 'lucide-react';

type AuthView = 'login' | 'signup_choose' | 'signup_puskesmas' | 'signup_posyandu';

export function AuthPage() {
  const { login } = useAuth();
  const [view, setView] = useState<AuthView>('login');

  // --- Login State ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Signup Puskesmas State ---
  const [pkmName, setPkmName] = useState('');
  const [pkmKapanewon, setPkmKapanewon] = useState('');
  const [pkmUsername, setPkmUsername] = useState('');
  const [pkmPassword, setPkmPassword] = useState('');
  const [pkmShowPassword, setPkmShowPassword] = useState(false);

  // --- Signup Posyandu State ---
  const [posName, setPosName] = useState('');
  const [posKalurahan, setPosKalurahan] = useState('');
  const [posPadukuhan, setPosPadukuhan] = useState('');
  const [posHealthCenterId, setPosHealthCenterId] = useState('');
  const [posUsername, setPosUsername] = useState('');
  const [posPassword, setPosPassword] = useState('');
  const [posShowPassword, setPosShowPassword] = useState(false);
  const [healthCenterList, setHealthCenterList] = useState<any[]>([]);

  // Fetch list of Puskesmas for Posyandu signup dropdown
  useEffect(() => {
    if (view === 'signup_posyandu') {
      fetch('/api/public/puskesmas')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setHealthCenterList(data.data);
            if (data.data.length > 0) {
              setPosHealthCenterId(data.data[0].id);
            }
          }
        })
        .catch(console.error);
    }
  }, [view]);

  const resetAll = () => {
    setErrorMsg('');
    setUsername('');
    setPassword('');
    setPkmName('');
    setPkmKapanewon('');
    setPkmUsername('');
    setPkmPassword('');
    setPosName('');
    setPosKalurahan('');
    setPosPadukuhan('');
    setPosUsername('');
    setPosPassword('');
  };

  // --- Login Handler ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username dan password wajib diisi');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login gagal');

      login(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Signup Puskesmas Handler ---
  const handleSignupPuskesmas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkmName.trim() || !pkmKapanewon.trim() || !pkmUsername.trim() || !pkmPassword.trim()) {
      setErrorMsg('Semua kolom wajib diisi');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PUSKESMAS',
          name: pkmName.trim(),
          kapanewon: pkmKapanewon.trim(),
          username: pkmUsername.trim(),
          password: pkmPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mendaftarkan Puskesmas');

      // Auto-login after successful signup
      login(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Signup Posyandu Handler ---
  const handleSignupPosyandu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posName.trim() || !posHealthCenterId || !posUsername.trim() || !posPassword.trim()) {
      setErrorMsg('Nama Posyandu, Puskesmas Pembina, Username, dan Password wajib diisi');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'POSYANDU',
          name: posName.trim(),
          kalurahan: posKalurahan.trim(),
          padukuhan: posPadukuhan.trim(),
          healthCenterId: posHealthCenterId,
          username: posUsername.trim(),
          password: posPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mendaftarkan Posyandu');

      login(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f0f2f5] text-[#111b21]">
      {/* Logo / Branding */}
      <div className="text-center mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="w-16 h-16 bg-[#075e54] text-[#25d366] rounded-full flex items-center justify-center mx-auto mb-3 shadow-md border-2 border-white">
          <Stethoscope className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-[#075e54] tracking-tight">Posyandu Digital</h1>
        <p className="text-sm text-[#54656f] font-bold">Kabupaten Gunungkidul — D.I. Yogyakarta</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 delay-100">
        <div className="bg-white rounded-3xl shadow-xl border border-[#e9edef] overflow-hidden">

          {/* ===== LOGIN VIEW ===== */}
          {view === 'login' && (
            <>
              <div className="bg-[#075e54] text-white p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-full">
                    <Lock className="w-5 h-5 text-[#25d366]" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-white text-lg leading-tight">Masuk ke Sistem</h2>
                    <p className="text-xs text-white/80 mt-0.5 flex items-center gap-1 font-medium">
                      <span>Dinas</span> <ArrowRight className="w-3 h-3 inline text-[#25d366]" /> <span>Puskesmas</span> <ArrowRight className="w-3 h-3 inline text-[#25d366]" /> <span>Posyandu</span>
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleLogin} className="p-5 space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#ef4444] font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#111b21] mb-1.5">Username</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username akun..."
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
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-[#8696a0] hover:text-[#111b21] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-sm shadow-md transition-all flex items-center justify-center gap-2 touch-press disabled:opacity-50"
                >
                  <span>{isLoading ? 'Memverifikasi...' : 'Masuk'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Signup CTA */}
              <div className="px-5 pb-5 pt-1 border-t border-[#e9edef]">
                <p className="text-xs text-[#54656f] text-center mb-3 font-medium">Belum punya akun?</p>
                <button
                  onClick={() => { resetAll(); setView('signup_choose'); }}
                  className="w-full py-3 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#111b21] font-bold rounded-full text-xs transition-all flex items-center justify-center gap-2 touch-press border border-[#e9edef]"
                >
                  <PlusCircle className="w-4 h-4 text-[#128c7e]" />
                  <span>Daftarkan Akun Puskesmas / Posyandu</span>
                </button>
              </div>
            </>
          )}

          {/* ===== SIGNUP CHOOSE VIEW ===== */}
          {view === 'signup_choose' && (
            <>
              <div className="bg-[#075e54] text-white p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-full">
                    <PlusCircle className="w-5 h-5 text-[#25d366]" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-white text-lg leading-tight">Pendaftaran Akun</h2>
                    <p className="text-xs text-[#e9edef] mt-0.5">Pilih jenis akun yang ingin didaftarkan</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-3.5">
                <p className="text-xs text-[#54656f] leading-relaxed font-medium">
                  Sistem Posyandu Digital menggunakan <strong>akun institusi berjenjang</strong>. Setiap lembaga mendaftar satu akun dengan satu username & password.
                </p>

                {/* Option: Puskesmas */}
                <button
                  onClick={() => { resetAll(); setView('signup_puskesmas'); }}
                  className="w-full p-4 bg-white hover:bg-[#f0f2f5] border-2 border-[#e9edef] hover:border-[#128c7e] rounded-2xl text-left transition-all touch-press group shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-[#128c7e] text-white rounded-full shadow-xs group-hover:scale-105 transition-transform">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-[#111b21] text-sm">Daftar sebagai Puskesmas</h3>
                      <p className="text-xs text-[#54656f] mt-0.5 font-medium">
                        Puskesmas membuat akun untuk mengelola Posyandu di wilayah binaan
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#8696a0] group-hover:text-[#128c7e] transition-colors shrink-0" />
                  </div>
                </button>

                {/* Option: Posyandu */}
                <button
                  onClick={() => { resetAll(); setView('signup_posyandu'); }}
                  className="w-full p-4 bg-white hover:bg-[#f0f2f5] border-2 border-[#e9edef] hover:border-[#075e54] rounded-2xl text-left transition-all touch-press group shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-[#075e54] text-white rounded-full shadow-xs group-hover:scale-105 transition-transform">
                      <Building className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-[#111b21] text-sm">Daftar sebagai Posyandu</h3>
                      <p className="text-xs text-[#54656f] mt-0.5 font-medium">
                        Posyandu mendaftar di bawah Puskesmas pembina untuk catat pengukuran
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#8696a0] group-hover:text-[#075e54] transition-colors shrink-0" />
                  </div>
                </button>

                {/* Hierarchy Explanation */}
                <div className="bg-[#f0f2f5] p-3.5 rounded-2xl border border-[#e9edef] text-xs text-[#54656f] space-y-2 font-medium">
                  <span className="font-bold text-[#111b21]">Alur Jenjang Akun:</span>
                  <div className="flex items-center gap-2 text-[11px] flex-wrap">
                    <span className="bg-[#8b5cf6]/10 text-[#8b5cf6] px-2.5 py-1 rounded-full font-bold border border-[#8b5cf6]/20 flex items-center gap-1">
                      <Landmark className="w-3 h-3" /> Dinas Kesehatan
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8696a0]" />
                    <span className="bg-[#128c7e]/10 text-[#128c7e] px-2.5 py-1 rounded-full font-bold border border-[#128c7e]/20 flex items-center gap-1">
                      <Hospital className="w-3 h-3" /> Puskesmas
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8696a0]" />
                    <span className="bg-[#075e54]/10 text-[#075e54] px-2.5 py-1 rounded-full font-bold border border-[#075e54]/20 flex items-center gap-1">
                      <Sprout className="w-3 h-3" /> Posyandu
                    </span>
                  </div>
                  <p className="text-[11px] text-[#54656f]">
                    Dinas sudah tersedia. Puskesmas mendaftar sendiri. Posyandu mendaftar di bawah Puskesmas.
                  </p>
                </div>

                <button
                  onClick={() => { resetAll(); setView('login'); }}
                  className="w-full py-2.5 text-xs text-[#54656f] font-bold hover:text-[#111b21] transition-all flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke halaman Login</span>
                </button>
              </div>
            </>
          )}

          {/* ===== SIGNUP PUSKESMAS VIEW ===== */}
          {view === 'signup_puskesmas' && (
            <>
              <div className="bg-[#075e54] text-white p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-full">
                    <Building2 className="w-5 h-5 text-[#25d366]" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-white text-lg leading-tight">Daftar Akun Puskesmas</h2>
                    <p className="text-xs text-[#e9edef] mt-0.5">1 akun institusi — 1 username & password</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSignupPuskesmas} className="p-5 space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#ef4444] font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Info Institusi */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-[#128c7e] uppercase tracking-wider">Data Puskesmas</span>

                  <div>
                    <label className="block text-xs font-bold text-[#111b21] mb-1">Nama Puskesmas <span className="text-[#ef4444]">*</span></label>
                    <input
                      type="text"
                      value={pkmName}
                      onChange={(e) => setPkmName(e.target.value)}
                      placeholder="Contoh: Puskesmas Semanu I"
                      required
                      className="w-full px-3.5 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111b21] mb-1">Kapanewon / Kecamatan <span className="text-[#ef4444]">*</span></label>
                    <input
                      type="text"
                      value={pkmKapanewon}
                      onChange={(e) => setPkmKapanewon(e.target.value)}
                      placeholder="Contoh: Semanu"
                      required
                      className="w-full px-3.5 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all"
                    />
                  </div>
                </div>

                {/* Credentials */}
                <div className="space-y-3 pt-3 border-t border-[#e9edef]">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#128c7e]" />
                    <span className="text-[11px] font-bold text-[#128c7e] uppercase tracking-wider">Kredensial Login</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111b21] mb-1">Username <span className="text-[#ef4444]">*</span></label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={pkmUsername}
                        onChange={(e) => setPkmUsername(e.target.value)}
                        placeholder="Contoh: pkm_semanu1"
                        autoComplete="username"
                        required
                        className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-mono font-medium text-[#111b21] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111b21] mb-1">Password <span className="text-[#ef4444]">*</span></label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
                      <input
                        type={pkmShowPassword ? 'text' : 'password'}
                        value={pkmPassword}
                        onChange={(e) => setPkmPassword(e.target.value)}
                        placeholder="Buat password yang aman"
                        autoComplete="new-password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all"
                      />
                      <button type="button" onClick={() => setPkmShowPassword(!pkmShowPassword)} className="absolute right-3.5 top-3 text-[#8696a0] hover:text-[#111b21]">
                        {pkmShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-sm shadow-md transition-all flex items-center justify-center gap-2 touch-press disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isLoading ? 'Mendaftarkan...' : 'Daftarkan Puskesmas & Masuk'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { resetAll(); setView('signup_choose'); }}
                  className="w-full py-2 text-xs text-[#54656f] font-bold hover:text-[#111b21] transition-all flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali pilih jenis akun</span>
                </button>
              </form>
            </>
          )}

          {/* ===== SIGNUP POSYANDU VIEW ===== */}
          {view === 'signup_posyandu' && (
            <>
              <div className="bg-[#075e54] text-white p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-full">
                    <Building className="w-5 h-5 text-[#25d366]" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-white text-lg leading-tight">Daftar Akun Posyandu</h2>
                    <p className="text-xs text-[#e9edef] mt-0.5">Wajib memilih Puskesmas Pembina</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSignupPosyandu} className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {errorMsg && (
                  <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#ef4444] font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Puskesmas Pembina Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-[#111b21] mb-1">
                    Puskesmas Pembina <span className="text-[#ef4444]">*</span>
                  </label>
                  {healthCenterList.length === 0 ? (
                    <div className="p-3.5 bg-[#f59e0b]/10 border border-[#f59e0b]/40 rounded-2xl text-xs text-[#111b21] font-bold space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0" />
                        <span>Belum ada Puskesmas terdaftar. Puskesmas harus mendaftar terlebih dahulu agar Posyandu bisa mendaftar di bawahnya.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setView('signup_puskesmas')}
                        className="w-full py-1.5 px-3 bg-[#128c7e] hover:bg-[#075e54] text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Daftarkan Puskesmas Sekarang</span>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
                      <select
                        value={posHealthCenterId}
                        onChange={(e) => setPosHealthCenterId(e.target.value)}
                        required
                        className="w-full pl-10 pr-8 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] appearance-none transition-all"
                      >
                        {healthCenterList.map((hc) => (
                          <option key={hc.id} value={hc.id}>
                            {hc.name} — Kapanewon {hc.kapanewon}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#8696a0] absolute right-3.5 top-3.5 pointer-events-none" />
                    </div>
                  )}
                </div>

                {/* Posyandu Info */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-[#128c7e] uppercase tracking-wider">Data Posyandu</span>

                  <div>
                    <label className="block text-xs font-bold text-[#111b21] mb-1">Nama Posyandu <span className="text-[#ef4444]">*</span></label>
                    <input
                      type="text"
                      value={posName}
                      onChange={(e) => setPosName(e.target.value)}
                      placeholder="Contoh: Posyandu Dahlia"
                      required
                      className="w-full px-3.5 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-[#111b21] mb-1">Kalurahan</label>
                      <input
                        type="text"
                        value={posKalurahan}
                        onChange={(e) => setPosKalurahan(e.target.value)}
                        placeholder="Wonosari"
                        className="w-full px-3.5 py-2 text-xs bg-[#f0f2f5] border border-[#e9edef] rounded-xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] text-[#111b21]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#111b21] mb-1">Padukuhan</label>
                      <input
                        type="text"
                        value={posPadukuhan}
                        onChange={(e) => setPosPadukuhan(e.target.value)}
                        placeholder="Purbosari"
                        className="w-full px-3.5 py-2 text-xs bg-[#f0f2f5] border border-[#e9edef] rounded-xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] text-[#111b21]"
                      />
                    </div>
                  </div>
                </div>

                {/* Credentials */}
                <div className="space-y-3 pt-3 border-t border-[#e9edef]">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#128c7e]" />
                    <span className="text-[11px] font-bold text-[#128c7e] uppercase tracking-wider">Kredensial Login Posyandu</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111b21] mb-1">Username <span className="text-[#ef4444]">*</span></label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={posUsername}
                        onChange={(e) => setPosUsername(e.target.value)}
                        placeholder="Contoh: pos_dahlia"
                        autoComplete="username"
                        required
                        className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-mono font-medium text-[#111b21] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111b21] mb-1">Password <span className="text-[#ef4444]">*</span></label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
                      <input
                        type={posShowPassword ? 'text' : 'password'}
                        value={posPassword}
                        onChange={(e) => setPosPassword(e.target.value)}
                        placeholder="Buat password yang aman"
                        autoComplete="new-password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-2xl outline-none focus:bg-white focus:border-2 focus:border-[#128c7e] font-medium text-[#111b21] transition-all"
                      />
                      <button type="button" onClick={() => setPosShowPassword(!posShowPassword)} className="absolute right-3.5 top-3 text-[#8696a0] hover:text-[#111b21]">
                        {posShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || healthCenterList.length === 0}
                  className="w-full py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-sm shadow-md transition-all flex items-center justify-center gap-2 touch-press disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isLoading ? 'Mendaftarkan...' : 'Daftarkan Posyandu & Masuk'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { resetAll(); setView('signup_choose'); }}
                  className="w-full py-2 text-xs text-[#54656f] font-bold hover:text-[#111b21] transition-all flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali pilih jenis akun</span>
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-xs text-[#54656f]">
          <p>© 2026 Posyandu Digital — Dinas Kesehatan Kab. Gunungkidul</p>
        </div>
      </div>
    </div>
  );
}

