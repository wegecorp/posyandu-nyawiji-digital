'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PatientData } from '@/lib/types';
import { Header } from '@/components/Header';
import { PatientCard } from '@/components/PatientCard';
import { DynamicMeasurementForm } from '@/components/DynamicMeasurementForm';
import { QuickRegisterModal } from '@/components/QuickRegisterModal';
import { QRModal } from '@/components/QRModal';
import { ExportModal } from '@/components/ExportModal';
import { LoginModal } from '@/components/LoginModal';
import { PuskesmasDashboard } from '@/components/PuskesmasDashboard';
import { DinkesDashboard } from '@/components/DinkesDashboard';
import { AnalisisPage } from '@/components/analisis/AnalisisPage';
import { AuthPage } from '@/components/AuthPage';
import { EditPatientModal } from '@/components/EditPatientModal';
import { DeletePatientConfirmModal } from '@/components/DeletePatientConfirmModal';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { ExitHint } from '@/components/ExitHint';
import { useBackLayer, useExitGuard } from '@/lib/back-navigation';
import { clearQueuedPatient } from '@/lib/offline-sync';
import { isStandaloneMode } from '@/lib/pwa';
import {
  Search,
  UserPlus,
  Users,
  ArrowLeft,
  QrCode,
  RefreshCw,
  Baby,
  Smile,
  User,
  Heart,
  Activity,
  LayoutGrid,
  ShieldAlert,
} from 'lucide-react';

export default function PosyanduApp() {
  const { user, isLoading: authLoading, switchActivePosyandu } = useAuth();
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NONE' | 'PARTIAL' | 'FULL'>('ALL');

  // Currently open / active patient for measurement
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  // Active view override for Puskesmas/Dinkes (null = default dashboard, 'posyandu_table' = viewing operational table)
  const [activeViewMode, setActiveViewMode] = useState<'default' | 'posyandu_table'>('default');
  // Main view: 'beranda' = dashboard/operational, 'analisis' = rekap visual
  const [mainView, setMainView] = useState<'beranda' | 'analisis'>('beranda');

  // Modal States
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isQRScanOpen, setIsQRScanOpen] = useState(false);
  const [isQRViewOpen, setIsQRViewOpen] = useState(false);
  const [qrPatientTarget, setQrPatientTarget] = useState<PatientData | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientData | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<PatientData | null>(null);
  const [showExitHint, setShowExitHint] = useState(false);

  const isReadOnly = user?.role === 'PUSKESMAS' || user?.role === 'DINKES';

  // Monotonic sequence — respons fetch pasien yang sudah basi (konteks/query berubah)
  // dibuang, tidak boleh menimpa daftar terbaru posyandu lain.
  const fetchSeqRef = useRef(0);
  const prevCtxRef = useRef<string | null>(null);

  // Fetch patients for active Posyandu (dipanggil dari event handler/refresh)
  const fetchPatients = async () => {
    if (!user?.posyanduId && user?.role === 'POSYANDU') return;
    const seq = ++fetchSeqRef.current;
    setIsLoading(true);
    try {
      const posId = user?.posyanduId || '';
      const res = await fetch(`/api/patients?posyanduId=${posId}&q=${encodeURIComponent(searchQuery)}`);
      if (seq !== fetchSeqRef.current) return; // ada fetch lebih baru
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setPatients(result.data);

        setSelectedPatient((prev) => {
          if (!prev) return null;
          return result.data.find((p: PatientData) => p.id === prev.id) || prev;
        });
      }
    } catch (e) {
      if (seq !== fetchSeqRef.current) return;
      console.error('Error fetching patients:', e);
    } finally {
      if (seq === fetchSeqRef.current) setIsLoading(false);
    }
  };

  // Debounce input pencarian 300ms — hindari refetch tiap ketik.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-fetch saat role/lokasi/query pencarian berubah
  useEffect(() => {
    if (!user?.posyanduId && user?.role === 'POSYANDU') return;
    let active = true;
    const posId = user?.posyanduId || '';
    const ctx = `${user?.role}:${posId}`;
    // Ganti akun/posyandu: kosongkan daftar lama segera (cegah kartu posyandu lain
    // tampil sementara / bertahan saat jaringan gagal).
    if (ctx !== prevCtxRef.current) {
      prevCtxRef.current = ctx;
      setPatients([]);
      setIsLoading(true);
    }
    const seq = ++fetchSeqRef.current;
    fetch(`/api/patients?posyanduId=${posId}&q=${encodeURIComponent(debouncedSearchQuery)}`)
      .then((r) => r.json())
      .then((result) => {
        if (!active || seq !== fetchSeqRef.current || !result.success || !Array.isArray(result.data))
          return;
        setPatients(result.data);
        setSelectedPatient((prev) => {
          if (!prev) return null;
          return result.data.find((p: PatientData) => p.id === prev.id) || prev;
        });
      })
      .catch((e) => {
        if (seq !== fetchSeqRef.current) return;
        console.error('Error fetching patients:', e);
      })
      .finally(() => {
        if (active && seq === fetchSeqRef.current) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.posyanduId, user?.role, debouncedSearchQuery]);

  // Filtered patients list
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // Category filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }
      // Status filter (berbasis persen kelengkapan data bulan ini)
      const pct = p.dataCompletionPercent ?? (p.measurementComplete ? 100 : 0);
      if (statusFilter === 'FULL' && pct !== 100) return false;
      if (statusFilter === 'PARTIAL' && (pct <= 0 || pct >= 100)) return false;
      if (statusFilter === 'NONE' && pct > 0) return false;

      return true;
    });
  }, [patients, selectedCategory, statusFilter]);

  // Ringkasan partisipasi bulan ini (transparan).
  const statusCounts = useMemo(() => {
    let none = 0;
    let partial = 0;
    let full = 0;
    for (const p of patients) {
      const pct = p.dataCompletionPercent ?? (p.measurementComplete ? 100 : 0);
      if (pct <= 0) none++;
      else if (pct >= 100) full++;
      else partial++;
    }
    const measured = partial + full;
    return {
      none,
      partial,
      full,
      measured,
      total: patients.length,
      percent: patients.length > 0 ? Math.round((measured / patients.length) * 100) : 0,
    };
  }, [patients]);

  // Handle Quick Register Success
  const handleRegisterSuccess = (newPatient: PatientData) => {
    setPatients((prev) => [newPatient, ...prev]);
    // Immediately open the newly registered patient's measurement form!
    setSelectedPatient(newPatient);
  };

  // Handle Edit Patient Success
  const handleEditSuccess = (updatedPatient: PatientData) => {
    setPatients((prev) => prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p)));
    if (selectedPatient?.id === updatedPatient.id) {
      setSelectedPatient(updatedPatient);
    }
  };

  // Handle Delete Patient Success
  const handleDeleteSuccess = (deletedPatientId: string) => {
    clearQueuedPatient(deletedPatientId);
    setPatients((prev) => prev.filter((p) => p.id !== deletedPatientId));
    setSelectedPatient((prev) => (prev?.id === deletedPatientId ? null : prev));
    setEditingPatient((prev) => (prev?.id === deletedPatientId ? null : prev));
  };

  // Handle QR Camera scan result
  const handleQRScanResult = (decodedRegNumber: string) => {
    const found = patients.find((p) => p.regNumber.trim().toUpperCase() === decodedRegNumber.trim().toUpperCase());
    if (found) {
      setSelectedPatient(found);
    } else {
      setSearchQuery(decodedRegNumber);
    }
  };

  const showPatientQR = (p: PatientData) => {
    setQrPatientTarget(p);
    setIsQRViewOpen(true);
  };

  const handleEnterPosyanduTable = (posId: string, posName: string, posCode: string) => {
    switchActivePosyandu(posId, posName, posCode);
    setActiveViewMode('posyandu_table');
    setSelectedPatient(null);
  };

  // Balik ke daftar + segarkan list (data pengukuran terbaru).
  const goBackToList = () => {
    setSelectedPatient(null);
    fetchPatients();
  };

  // Navigasi tombol back OS/hardware — tiap layer menggeser satu history entry.
  // Pop-up keluar hanya di mode standalone (PWA terpasang); di browser biarkan back native.
  useExitGuard(Boolean(user) && isStandaloneMode(), () => setShowExitHint(true));
  useBackLayer(mainView === 'analisis', () => setMainView('beranda'));
  useBackLayer(activeViewMode === 'posyandu_table', () => setActiveViewMode('default'));
  useBackLayer(Boolean(selectedPatient), goBackToList);

  // 0. Still validating session against server — show splash to avoid flash of login page
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
        <div className="text-center space-y-2">
          <RefreshCw className="w-7 h-7 animate-spin text-[#075e54] mx-auto" />
          <p className="text-xs font-bold text-[#54656f]">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  // 1. IF NOT LOGGED IN — show login (cascade kader / staf)
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5] text-[#111b21]">
      {/* 1. STICKY HEADER */}
      <Header
        onOpenScanQR={() => setIsQRScanOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        showTools={user.role === 'POSYANDU' || activeViewMode === 'posyandu_table'}
        mainView={mainView}
        onNavigateMainView={(view) => {
          setMainView(view);
          setActiveViewMode('default');
          setSelectedPatient(null);
        }}
      />

      {/* 2. MAIN CONTAINER */}
      <main className={`flex-1 mx-auto p-3 sm:p-4 ${mainView === 'analisis' ? 'max-w-5xl' : 'max-w-2xl w-full'}`}>
        {/* ANALISIS PAGE (all roles) */}
        {mainView === 'analisis' ? (
          <AnalisisPage />
        ) : /* VIEW 1: DINKES DASHBOARD */
        user.role === 'DINKES' && activeViewMode === 'default' ? (
          <DinkesDashboard
            onExportAll={() => setIsExportOpen(true)}
            onEnterPosyandu={handleEnterPosyanduTable}
          />
        ) : /* VIEW 2: PUSKESMAS DASHBOARD */
        user.role === 'PUSKESMAS' && activeViewMode === 'default' ? (
          <PuskesmasDashboard
            onEnterPosyandu={handleEnterPosyanduTable}
            onExport={() => setIsExportOpen(true)}
          />
        ) : /* VIEW 3: POSYANDU OPERATIONAL TABLE & MEASUREMENT FORMS */
        selectedPatient ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {/* Back button to patient list */}
            <div className="flex items-center justify-between">
              <button
                onClick={goBackToList}
                className="flex items-center gap-1.5 text-xs font-bold text-[#075e54] bg-white hover:bg-[#e7fceb] px-4 py-2 rounded-full border border-[#e9edef] shadow-xs transition-all touch-press"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#128c7e]" />
                <span>Daftar Pasien ({patients.length})</span>
              </button>

              <div className="text-[11px] text-[#54656f] font-medium">
                Sesi: <span className="font-bold text-[#075e54]">{user.posyanduName || 'Posyandu'}</span>
              </div>
            </div>

            {/* Dynamic Age-Adaptive Measurement Form */}
            <DynamicMeasurementForm
              patient={selectedPatient}
              onBackToList={goBackToList}
              onShowQR={(p) => showPatientQR(p)}
            />
          </div>
        ) : (
          /* VIEW 4: PATIENT LIST & QUEUE FOR POSYANDU */
          <div className="space-y-3.5 animate-in fade-in duration-150 pb-20">
            {activeViewMode === 'posyandu_table' && (
              <button
                onClick={() => setActiveViewMode('default')}
                className="flex items-center gap-1.5 text-xs font-bold text-[#075e54] bg-white hover:bg-[#e7fceb] px-4 py-2 rounded-full border border-[#e9edef] shadow-xs transition-all touch-press"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#128c7e]" />
                <span>Kembali ke Dashboard</span>
              </button>
            )}

            {isReadOnly && (
              <div className="bg-[#075e54] text-white p-3.5 rounded-2xl border border-[#e9edef] flex items-center gap-3 shadow-xs">
                <ShieldAlert className="w-5 h-5 text-[#fbbf24] shrink-0" />
                <div className="text-xs">
                  <span className="font-extrabold text-[#fbbf24] block">Mode Lihat Data Ringkasan (Read-Only)</span>
                  <span className="text-[#d1fae5]">
                    Akun <strong>{user?.role}</strong> hanya memiliki akses tinjauan. Hak tambah, edit, dan hapus pasien dikhususkan untuk Kader Posyandu.
                  </span>
                </div>
              </div>
            )}

            {/* Search Input Bar (WhatsApp Search Bar) */}
            <div className="bg-white rounded-xl p-1 shadow-sm border border-[#e9edef] flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8696a0] absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama pasien..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[#f0f2f5] rounded-lg border border-[#e9edef] outline-none focus:bg-white focus:border focus:border-[#075e54] font-medium text-[#111b21] placeholder-[#8696a0] transition-all"
                />
              </div>

              <button
                onClick={() => setIsQRScanOpen(true)}
                className="w-9 h-9 bg-[#075e54] hover:bg-[#054c44] text-white rounded-lg flex items-center justify-center transition-all touch-press shrink-0 shadow-xs"
                title="Scan QR Code Pasien"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>

            {/* Ringkasan partisipasi bulan ini */}
            <div className="bg-white rounded-lg border border-[#e9edef] p-2.5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-[#54656f]">
                  Terisi bulan ini:{' '}
                  <strong className="text-[#075e54]">
                    {statusCounts.measured}/{statusCounts.total}
                  </strong>
                </span>
                <span className="text-[#075e54]">{statusCounts.percent}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#f0f2f5] rounded-full overflow-hidden">
                <div className="h-full bg-[#25d366] rounded-full" style={{ width: `${statusCounts.percent}%` }} />
              </div>
            </div>

            {/* Status Filter Tabs (scroll horizontal) */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar text-xs font-semibold text-[#54656f]">
              {[
                { id: 'ALL', label: `Semua (${statusCounts.total})`, active: 'bg-[#075e54] text-white shadow-xs' },
                { id: 'NONE', label: `Belum (${statusCounts.none})`, active: 'bg-[#dc2626] text-white shadow-xs' },
                { id: 'PARTIAL', label: `Sebagian (${statusCounts.partial})`, active: 'bg-[#ea580c] text-white shadow-xs' },
                { id: 'FULL', label: `Lengkap (${statusCounts.full})`, active: 'bg-[#128c7e] text-white shadow-xs' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                  className={`px-3.5 py-2 rounded-lg border whitespace-nowrap transition-all shrink-0 touch-press ${
                    statusFilter === tab.id
                      ? `${tab.active} border-transparent`
                      : 'bg-white border-[#e9edef] hover:bg-[#f0f2f5]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-medium">
              {[
                { id: 'ALL', label: 'Semua Usia', icon: LayoutGrid },
                { id: 'BAYI', label: 'Bayi (0-5 bln)', icon: Baby },
                { id: 'BALITA_APRAS', label: 'Balita & Apras (6 bln-6 th)', icon: Smile },
                { id: 'REMAJA', label: 'Remaja (7-17 th)', icon: User },
                { id: 'DEWASA', label: 'Dewasa (18-59 th)', icon: Users },
                { id: 'LANSIA', label: 'Lansia (60+ th)', icon: Activity },
                { id: 'BUMIL', label: 'Ibu Hamil', icon: Heart },
              ].map((cat) => {
                const IconComponent = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#075e54] text-white border-[#075e54] shadow-xs scale-102'
                        : 'bg-white text-[#111b21] border-[#e9edef] hover:bg-[#f0f2f5]'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-[#25d366]' : 'text-[#8696a0]'}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Patient Cards List */}
            {isLoading ? (
              <div className="p-12 text-center text-sm font-bold text-[#54656f] flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#075e54]" />
                <span>Memuat data pasien...</span>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-[#e9edef] text-center space-y-4 shadow-xs">
                <div className="w-14 h-14 bg-[#e7fceb] text-[#075e54] rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#111b21] text-base">Tidak ada pasien ditemukan</h3>
                  <p className="text-xs text-[#54656f] mt-1 font-medium">
                    {searchQuery
                      ? 'Coba ketik nama lain di pencarian'
                      : 'Belum ada pasien terdaftar di posyandu ini'}
                  </p>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => setIsRegisterOpen(true)}
                    className="py-3.5 px-6 bg-[#25d366] hover:bg-[#128c7e] text-white font-black rounded-xl text-sm shadow-md transition-all inline-flex items-center gap-2 touch-press"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Daftarkan Pasien Baru</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredPatients.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    isSelected={false}
                    onSelect={(p) => setSelectedPatient(p)}
                    onShowQR={(e, p) => {
                      e.stopPropagation();
                      showPatientQR(p);
                    }}
                    onEdit={isReadOnly ? undefined : (p) => setEditingPatient(p)}
                  />
                ))}
              </div>
            )}

            {/* WhatsApp Floating Action Button (FAB) for Quick Patient Register */}
            {!isReadOnly && !selectedPatient && (
              <div className="fixed bottom-6 right-6 z-40">
                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="bg-[#25d366] hover:bg-[#128c7e] text-white font-black px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-2.5 border-2 border-white transition-all touch-press text-sm active:scale-95"
                  title="Tambah Pasien Baru"
                >
                  <UserPlus className="w-6 h-6 text-white" />
                  <span className="font-black text-sm">PASIEN BARU</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALS */}
      {/* 1. Quick Registration Modal */}
      <QuickRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={handleRegisterSuccess}
      />

      {/* 2. QR Code Camera Scanner Modal */}
      <QRModal
        mode="scan"
        isOpen={isQRScanOpen}
        onClose={() => setIsQRScanOpen(false)}
        onScanSuccess={handleQRScanResult}
      />

      {/* 3. QR Code View Card Modal */}
      <QRModal
        mode="view"
        patient={qrPatientTarget}
        isOpen={isQRViewOpen}
        onClose={() => setIsQRViewOpen(false)}
      />

      {/* 4. Rekap Ringkas / Export */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* 5. Login & Account Switcher Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          fetchPatients();
        }}
        onChangePassword={() => setIsChangePassOpen(true)}
      />

      {/* 6. Change Password Modal (Self Service) */}
      <ChangePasswordModal
        isOpen={isChangePassOpen}
        onClose={() => setIsChangePassOpen(false)}
      />

      {/* 7. Edit Patient Modal */}
      <EditPatientModal
        key={editingPatient?.id || 'edit-closed'}
        isOpen={Boolean(editingPatient)}
        patient={editingPatient}
        onClose={() => setEditingPatient(null)}
        onSuccess={handleEditSuccess}
        onRequestDelete={(p) => setDeletingPatient(p)}
      />

      {/* 7b. Delete Patient Confirm Modal */}
      <DeletePatientConfirmModal
        isOpen={Boolean(deletingPatient)}
        patient={deletingPatient}
        onClose={() => setDeletingPatient(null)}
        onSuccess={handleDeleteSuccess}
      />

      {/* 8. Hint keluar aplikasi (back dua kali di layar root, mode standalone) */}
      <ExitHint show={showExitHint} onHide={() => setShowExitHint(false)} />
    </div>
  );
}

