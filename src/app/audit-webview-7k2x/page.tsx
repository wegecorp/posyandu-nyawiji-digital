'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Smartphone,
  Server,
  RefreshCw,
  Send,
  Trash2,
  ArrowLeft,
  Key,
} from 'lucide-react';
import Link from 'next/link';
import { todayLocalISODate } from '@/lib/utils';

export default function DevAuditWebviewPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [userAgent, setUserAgent] = useState('');
  const [isGSA, setIsGSA] = useState(false);
  const [name, setName] = useState('Anak Uji Coba');
  const [birthDate, setBirthDate] = useState('2024-05-10');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [isPregnant, setIsPregnant] = useState(false);
  const [dryRun, setDryRun] = useState(true);

  const [isRunning, setIsRunning] = useState(false);
  const [resultData, setResultData] = useState<Record<string, unknown> | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      setUserAgent(ua);
      setIsGSA(/GSA\//i.test(ua));
    }
  }, []);

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setResultData(null);
    setHttpStatus(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/dev-audit', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || '',
        },
        body: JSON.stringify({
          name,
          birthDate,
          gender,
          isPregnant,
          posyanduId: user?.posyanduId,
          dryRun,
        }),
      });

      setHttpStatus(res.status);
      const data = await res.json();
      setResultData(data);

      if (data.createdId) {
        setCreatedPatientId(data.createdId);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghubungi server (Network Error)');
    } finally {
      setIsRunning(false);
    }
  };

  const handleDeleteTestPatient = async () => {
    if (!createdPatientId) return;
    setIsRunning(true);
    try {
      const res = await fetch(`/api/dev-audit?id=${createdPatientId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedPatientId(null);
        alert(data.message || 'Pasien uji berhasil dihapus');
      } else {
        alert(data.error || 'Gagal menghapus');
      }
    } catch (err) {
      alert('Error hapus pasien test');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-[#111b21] p-4 sm:p-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header Bar */}
        <div className="bg-[#075e54] text-white p-4 rounded-2xl shadow flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                Dev Only
              </span>
              <h1 className="font-extrabold text-base">Audit Diagnostik Pendaftaran</h1>
            </div>
            <p className="text-xs text-[#e9edef] mt-0.5">Uji coba submit Google App / WebView tanpa merusak data DB</p>
          </div>
          <Link
            href="/"
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
            title="Kembali ke Beranda"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>

        {/* Device & Browser Environment Inspector */}
        <div className="bg-white p-4 rounded-2xl border border-[#e9edef] shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#54656f] uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#075e54]" />
              Lingkungan Browser HP
            </span>
            {isGSA ? (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
                ⚠️ Terdeteksi Google App (GSA)
              </span>
            ) : (
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
                Standard Browser
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono bg-[#f0f2f5] p-2 rounded-xl break-all text-[#54656f] border border-[#e9edef]">
            {userAgent || 'Membaca User-Agent...'}
          </p>
        </div>

        {/* Current Auth Status Card */}
        <div className="bg-white p-4 rounded-2xl border border-[#e9edef] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#54656f] uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4 text-[#075e54]" />
              Status Sesi Saat Ini
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                user?.role === 'POSYANDU'
                  ? 'bg-emerald-100 text-emerald-800'
                  : user
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {isAuthLoading ? 'Memeriksa...' : user ? `Role: ${user.role}` : 'Belum Login'}
            </span>
          </div>

          {user ? (
            <div className="text-xs space-y-1">
              <p>
                <span className="text-[#54656f]">Nama Akun: </span>
                <strong>{user.name}</strong> ({user.username})
              </p>
              {user.posyanduName && (
                <p>
                  <span className="text-[#54656f]">Posyandu Aktif: </span>
                  <strong className="text-[#075e54]">{user.posyanduName}</strong> (ID: {user.posyanduId})
                </p>
              )}
              {user.role !== 'POSYANDU' && (
                <p className="text-amber-700 bg-amber-50 p-2 rounded-xl text-[11px] border border-amber-200 mt-2">
                  ⚠️ Perhatian: Pendaftaran pasien hanya diizinkan untuk role <strong>POSYANDU</strong>. Akun ini hanya
                  Read-Only.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-rose-600">
              Sesi kosong. Silakan buka halaman utama dan login akun Kader terlebih dahulu.
            </p>
          )}
        </div>

        {/* Test Registration Form */}
        <form onSubmit={handleRunAudit} noValidate className="bg-white p-4 rounded-2xl border border-[#e9edef] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#e9edef] pb-2">
            <span className="text-xs font-bold text-[#54656f] uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-4 h-4 text-[#075e54]" />
              Uji Coba Form Pendaftaran
            </span>
            <div className="flex items-center gap-1">
              <label className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="rounded accent-[#075e54]"
                />
                <span className={dryRun ? 'text-[#075e54] font-black' : 'text-[#54656f]'}>
                  Dry-Run (Aman, Tanpa Tulis DB)
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111b21] mb-1">Nama Pasien Uji</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-xl outline-none focus:bg-white focus:border-[#128c7e]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111b21] mb-1">
              Tanggal Lahir (Cek apakah datepicker HP mengirim nilai)
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={todayLocalISODate()}
              className="w-full px-3 py-2 text-sm bg-[#f0f2f5] border border-[#e9edef] rounded-xl outline-none focus:bg-white focus:border-[#128c7e]"
            />
            <p className="text-[11px] text-[#54656f] mt-1">Nilai state saat ini: <code>&quot;{birthDate}&quot;</code></p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111b21] mb-1">Jenis Kelamin</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('L')}
                className={`py-2 rounded-xl text-xs font-bold border ${
                  gender === 'L' ? 'bg-[#075e54] text-white border-[#075e54]' : 'bg-[#f0f2f5] text-[#111b21]'
                }`}
              >
                Laki-laki (L)
              </button>
              <button
                type="button"
                onClick={() => setGender('P')}
                className={`py-2 rounded-xl text-xs font-bold border ${
                  gender === 'P' ? 'bg-rose-500 text-white border-rose-500' : 'bg-[#f0f2f5] text-[#111b21]'
                }`}
              >
                Perempuan (P)
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isRunning}
            className="w-full py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menjalankan Uji Coba...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Jalankan Test Submit {dryRun ? '(Dry-Run Simulasi)' : '(Simpan Nyata)'}</span>
              </>
            )}
          </button>
        </form>

        {/* Real-time Response Output Console */}
        {(resultData || errorMsg || httpStatus) && (
          <div className="bg-white p-4 rounded-2xl border border-[#e9edef] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#54656f] uppercase tracking-wider">Hasil Eksekusi</span>
              {httpStatus && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    httpStatus === 200
                      ? 'bg-emerald-100 text-emerald-800'
                      : httpStatus === 409
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  HTTP {httpStatus}
                </span>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-bold">
                <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {resultData && (
              <div className="space-y-3">
                {Boolean(resultData.success) ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{String(resultData.message || 'Audit Berhasil!')}</span>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-bold">
                    <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{String(resultData.error || 'Audit Gagal!')}</span>
                  </div>
                )}

                {/* Validation Steps Checklist */}
                {Boolean(resultData.steps) && typeof resultData.steps === 'object' && (
                  <div className="bg-[#f0f2f5] p-3 rounded-xl space-y-1.5 border border-[#e9edef] text-xs">
                    <span className="font-bold text-[#111b21] block mb-1">Rincian Langkah Validasi:</span>
                    {Object.entries(resultData.steps as Record<string, { status: string; detail?: string }>).map(
                      ([key, val]) => (
                        <div key={key} className="flex items-start gap-2">
                          {val.status === 'PASS' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-semibold uppercase text-[10px] text-[#54656f]">{key}: </span>
                            <span className="text-[#111b21]">{String(val.detail || '')}</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* JSON Raw Dump */}
                <details className="text-[11px] font-mono bg-slate-900 text-emerald-400 p-3 rounded-xl overflow-x-auto">
                  <summary className="cursor-pointer text-slate-300 font-bold mb-1">
                    Lihat Raw Response JSON
                  </summary>
                  <pre>{JSON.stringify(resultData, null, 2)}</pre>
                </details>

                {createdPatientId && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-amber-900 font-bold">Pasien uji tersimpan di DB</span>
                    <button
                      type="button"
                      onClick={handleDeleteTestPatient}
                      className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 hover:bg-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Pasien Ini Sekarang</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
