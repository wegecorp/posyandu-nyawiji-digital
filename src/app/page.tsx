'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PatientData } from '@/lib/types';
import { Header } from '@/components/Header';
import { PatientCard } from '@/components/PatientCard';
import { DynamicMeasurementForm } from '@/components/DynamicMeasurementForm';
import { QuickRegisterModal } from '@/components/QuickRegisterModal';
import { QRModal } from '@/components/QRModal';
import { RekapExportModal } from '@/components/RekapExportModal';
import { LoginModal } from '@/components/LoginModal';
import { PuskesmasDashboard } from '@/components/PuskesmasDashboard';
import { DinkesDashboard } from '@/components/DinkesDashboard';
import { AuthPage } from '@/components/AuthPage';
import { EditPatientModal } from '@/components/EditPatientModal';
import { DeletePatientConfirmModal } from '@/components/DeletePatientConfirmModal';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import {
  Search,
  UserPlus,
  Users,
  Filter,
  CheckCircle2,
  CircleDashed,
  ArrowLeft,
  QrCode,
  Sparkles,
  RefreshCw,
  Baby,
  Smile,
  User,
  Heart,
  LayoutGrid,
  ShieldAlert,
} from 'lucide-react';

export default function PosyanduApp() {
  const { user, isLoading, switchActivePosyandu } = useAuth();
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNMEASURED' | 'MEASURED'>('ALL');

  // Currently open / active patient for measurement
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);

  // Active view override for Puskesmas/Dinkes (null = default dashboard, 'posyandu_table' = viewing operational table)
  const [activeViewMode, setActiveViewMode] = useState<'default' | 'posyandu_table'>('default');

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

  const isReadOnly = user?.role === 'PUSKESMAS' || user?.role === 'DINKES';

  // Fetch patients for active Posyandu
  const fetchPatients = useCallback(async () => {
    if (!user?.posyanduId && user?.role === 'POSYANDU') return;
    setIsLoading(true);
    try {
      const posId = user?.posyanduId || '';
      const res = await fetch(`/api/patients?posyanduId=${posId}&q=${encodeURIComponent(searchQuery)}`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setPatients(result.data);

        setSelectedPatient((prev) => {
          if (!prev) return null;
          return result.data.find((p: PatientData) => p.id === prev.id) || prev;
        });
      }
    } catch (e) {
      console.error('Error fetching patients:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.posyanduId, user?.role, searchQuery]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Reset login modal state whenever user changes or logs out
  useEffect(() => {
    if (!user) {
      setIsLoginOpen(false);
    }
  }, [user]);

  // Filtered patients list
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // Category filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter === 'MEASURED' && !p.todayMeasurement) return false;
      if (statusFilter === 'UNMEASURED' && p.todayMeasurement) return false;

      return true;
    });
  }, [patients, selectedCategory, statusFilter]);

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
    setPatients((prev) => prev.filter((p) => p.id !== deletedPatientId));
    if (selectedPatient?.id === deletedPatientId) {
      setSelectedPatient(null);
    }
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

  // 0. Still validating session against server — show splash to avoid flash of login page
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f7ff]">
        <div className="text-center space-y-2">
          <RefreshCw className="w-7 h-7 animate-spin text-[#075e54] mx-auto" />
          <p className="text-xs font-bold text-[#54656f]">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  // 1. IF NOT LOGGED IN — show full-page login/signup
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7ff] text-[#1e293b]">
      {/* 1. STICKY HEADER */}
      <Header
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenScanQR={() => setIsQRScanOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onRefresh={fetchPatients}
        onBackToDashboard={
          activeViewMode === 'posyandu_table' && (user.role === 'PUSKESMAS' || user.role === 'DINKES')
            ? () => {
                setActiveViewMode('default');
                setSelectedPatient(null);
              }
            : undefined
        }
      />

      {/* 2. MAIN CONTAINER */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-3 sm:p-4">
        {/* VIEW 1: DINKES DASHBOARD */}
        {user.role === 'DINKES' && activeViewMode === 'default' ? (
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
                onClick={() => setSelectedPatient(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#0f172a] hover:text-[#0284c7] bg-white hover:bg-[#f0f7ff] px-4 py-2 rounded-full border border-[#e2e8f0] shadow-xs transition-all touch-press"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#0284c7]" />
                <span>Daftar Pasien ({patients.length})</span>
              </button>

              <div className="text-[11px] text-[#64748b] font-medium">
                Sesi: <span className="font-bold text-[#0f172a]">{user.posyanduName || 'Posyandu'}</span>
              </div>
            </div>

            {/* Dynamic Age-Adaptive Measurement Form */}
            <DynamicMeasurementForm
              patient={selectedPatient}
              onBackToList={() => setSelectedPatient(null)}
              onShowQR={(p) => showPatientQR(p)}
              onMeasurementUpdated={fetchPatients}
            />
          </div>
        ) : (
          /* VIEW 4: PATIENT LIST & QUEUE FOR POSYANDU */
          <div className="space-y-3.5 animate-in fade-in duration-150 pb-20">
            {isReadOnly && (
              <div className="bg-[#0f172a] text-white p-3.5 rounded-2xl border border-[#cbd5e1] flex items-center gap-3 shadow-xs">
                <ShieldAlert className="w-5 h-5 text-[#fbbf24] shrink-0" />
                <div className="text-xs">
                  <span className="font-extrabold text-[#fbbf24] block">Mode Lihat Data Ringkasan (Read-Only)</span>
                  <span className="text-[#cbd5e1]">
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

            {/* Status Filter Tabs (Semua / Belum Diukur / Sudah Diukur) */}
            <div className="flex bg-white p-1 rounded-lg border border-[#e9edef] text-xs font-semibold text-[#54656f] shadow-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 py-1.5 rounded transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-[#075e54] text-white shadow-xs'
                    : 'hover:text-[#111b21]'
                }`}
              >
                Semua ({patients.length})
              </button>
              <button
                onClick={() => setStatusFilter('UNMEASURED')}
                className={`flex-1 py-1.5 rounded transition-all flex items-center justify-center gap-1 ${
                  statusFilter === 'UNMEASURED'
                    ? 'bg-[#ea580c] text-white shadow-xs'
                    : 'hover:text-[#111b21]'
                }`}
              >
                <CircleDashed className="w-3.5 h-3.5" />
                <span>Belum ({patients.filter((p) => !p.todayMeasurement).length})</span>
              </button>
              <button
                onClick={() => setStatusFilter('MEASURED')}
                className={`flex-1 py-1.5 rounded transition-all flex items-center justify-center gap-1 ${
                  statusFilter === 'MEASURED'
                    ? 'bg-[#128c7e] text-white shadow-xs'
                    : 'hover:text-[#111b21]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Selesai ({patients.filter((p) => p.todayMeasurement).length})</span>
              </button>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-medium">
              {[
                { id: 'ALL', label: 'Semua Usia', icon: LayoutGrid, activeColor: 'bg-[#075e54] text-white border-[#075e54]', iconColor: 'text-[#075e54]' },
                { id: 'BALITA', label: 'Balita (<5th)', icon: Baby, activeColor: 'bg-sky-600 text-white border-sky-600', iconColor: 'text-sky-600' },
                { id: 'ANAK', label: 'Anak (5-9th)', icon: Smile, activeColor: 'bg-emerald-600 text-white border-emerald-600', iconColor: 'text-emerald-600' },
                { id: 'REMAJA', label: 'Remaja (10-17th)', icon: User, activeColor: 'bg-indigo-600 text-white border-indigo-600', iconColor: 'text-indigo-600' },
                { id: 'DEWASA_LANSIA', label: 'Dewasa/Lansia', icon: Users, activeColor: 'bg-teal-600 text-white border-teal-600', iconColor: 'text-teal-600' },
                { id: 'BUMIL', label: 'Ibu Hamil', icon: Heart, activeColor: 'bg-rose-600 text-white border-rose-600', iconColor: 'text-rose-600' },
              ].map((cat) => {
                const IconComponent = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                      isActive
                        ? `${cat.activeColor} shadow-xs scale-102`
                        : 'bg-white text-[#111b21] border-[#e9edef] hover:bg-[#f0f2f5]'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-white' : cat.iconColor}`} />
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
                    onDelete={isReadOnly ? undefined : (p) => setDeletingPatient(p)}
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

      {/* 4. Rekap Excel Export Modal */}
      <RekapExportModal
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
        isOpen={Boolean(editingPatient)}
        patient={editingPatient}
        onClose={() => setEditingPatient(null)}
        onSuccess={handleEditSuccess}
      />

      {/* 8. Delete Patient Confirmation Modal */}
      <DeletePatientConfirmModal
        isOpen={Boolean(deletingPatient)}
        patient={deletingPatient}
        onClose={() => setDeletingPatient(null)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}

