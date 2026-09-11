'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  QrCode,
  WifiOff,
  FileSpreadsheet,
  ChevronDown,
  LayoutDashboard,
  BarChart3,
  RefreshCw,
  Download,
} from 'lucide-react';
import { getSyncQueue, flushSyncQueue } from '@/lib/offline-sync';
import { usePwaInstall, type InstallGuide } from '@/lib/pwa';
import { InstallAppModal } from '@/components/InstallAppModal';

interface HeaderProps {
  onOpenScanQR: () => void;
  onOpenExport: () => void;
  onOpenLogin: () => void;
  showTools?: boolean;
  mainView?: 'beranda' | 'analisis';
  onNavigateMainView?: (view: 'beranda' | 'analisis') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenScanQR,
  onOpenExport,
  onOpenLogin,
  showTools = true,
  mainView = 'beranda',
  onNavigateMainView,
}) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  // Fitur "INSTALL APLIKASI" (PWA -> simpan ke layar utama)
  const { showInstallButton, install } = usePwaInstall();
  const [installGuide, setInstallGuide] = useState<InstallGuide | null>(null);

  const handleInstallTap = async () => {
    const result = await install();
    if (result?.action === 'guide') setInstallGuide(result.guide);
  };

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(navigator.onLine);
      const queue = getSyncQueue();
      setUnsyncedCount(queue.length);
      // Auto-flush stale items when online (handles page reload / session change).
      if (navigator.onLine && queue.length > 0) {
        void flushSyncQueue();
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    const interval = setInterval(updateStatus, 3000);

    // Flush on mount if online and items exist.
    if (navigator.onLine) {
      const queue = getSyncQueue();
      if (queue.length > 0) {
        void flushSyncQueue();
      }
    }

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      clearInterval(interval);
    };
  }, []);

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'DINKES':
        return { label: 'DINAS KESEHATAN GK', color: 'bg-white/15 text-white border border-white/20' };
      case 'PUSKESMAS':
        return { label: 'PUSKESMAS', color: 'bg-white/15 text-white border border-white/20' };
      case 'POSYANDU':
        return { label: 'POSYANDU', color: 'bg-white/15 text-white border border-white/20' };
      default:
        return { label: 'TIDAK TERAUTENTIKASI', color: 'bg-white/15 text-white border border-white/20' };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <header className="sticky top-0 z-40 bg-[#075e54] text-white shadow-md">
      {/* Main Action Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 max-w-2xl mx-auto">
        {/* Account Info Button */}
        <button
          onClick={onOpenLogin}
          className="flex items-center gap-2.5 text-left hover:bg-white/10 rounded-xl px-2 py-1 transition-all touch-press"
        >
          <div className="w-9 h-9 rounded-full bg-[#128c7e] text-white flex items-center justify-center font-black text-sm shrink-0 border border-white/20 shadow-xs">
            {user?.role === 'DINKES' ? 'DK' : user?.role === 'PUSKESMAS' ? 'PK' : 'PS'}
          </div>
          <div className="truncate max-w-[140px] sm:max-w-[220px]">
            <div className="font-extrabold text-white truncate text-sm leading-tight">
              {user?.name || user?.posyanduName || 'POSYANDU NYAWIJI DIGITAL'}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/70" />
            </div>
          </div>
        </button>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Install Aplikasi (PWA) ke Layar Utama */}
          {showInstallButton && (
            <button
              onClick={handleInstallTap}
              aria-label="Install Aplikasi"
              className="h-11 px-3.5 text-white bg-white/10 hover:bg-white/20 rounded-full transition-all touch-press flex items-center justify-center gap-2 border border-white/20 shrink-0"
              title="Install / Simpan Aplikasi di Layar Utama"
            >
              <Download className="w-5 h-5 text-[#25d366] shrink-0" />
              <span className="text-xs font-bold leading-tight">
                <span className="hidden sm:inline">Install Aplikasi</span>
                <span className="sm:hidden">Install</span>
              </span>
            </button>
          )}

          {/* Scan QR Button */}
          {showTools && (
            <button
              onClick={onOpenScanQR}
              aria-label="Scan QR Pasien"
              className="w-11 h-11 text-white bg-white/10 hover:bg-white/20 rounded-full transition-all touch-press flex items-center justify-center border border-white/20 shrink-0"
              title="Scan QR Code Pasien"
            >
              <QrCode className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Rekap Ringkas */}
          {showTools && (
            <button
              onClick={onOpenExport}
              aria-label="Rekap Ringkas"
              className="w-11 h-11 text-white bg-white/10 hover:bg-white/20 rounded-full transition-all touch-press flex items-center justify-center border border-white/20 shrink-0"
              title="Rekap Ringkas"
            >
              <FileSpreadsheet className="w-5 h-5 text-[#25d366]" />
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation — Beranda | Analisis */}
      {onNavigateMainView && (
        <div className="px-4 pb-1.5 max-w-2xl mx-auto flex gap-1">
          <button
            onClick={() => onNavigateMainView('beranda')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-bold transition-all ${
              mainView === 'beranda'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Beranda
          </button>
          <button
            onClick={() => onNavigateMainView('analisis')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-bold transition-all ${
              mainView === 'analisis'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analisis
          </button>
        </div>
      )}

      {/* Status Alert — muncul hanya saat luring / ada data belum sinkron */}
      {(!isOnline || unsyncedCount > 0) && (
        <div
          className={`px-4 py-1.5 text-xs font-bold border-t flex items-center justify-center gap-2 text-center ${
            isOnline ? 'bg-[#054c44] text-[#fbbf24] border-[#075e54]' : 'bg-[#b45309] text-white border-[#b45309]'
          }`}
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>
                Luring — data disimpan di perangkat{unsyncedCount > 0 ? ` (${unsyncedCount} belum tersinkron)` : ''}. Tersinkron otomatis saat online.
              </span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
              <span>{unsyncedCount} catatan menunggu sinkron ke server...</span>
            </>
          )}
        </div>
      )}

      {/* Panduan Install / Simpan ke Layar Utama */}
      <InstallAppModal guide={installGuide} onClose={() => setInstallGuide(null)} />
    </header>
  );
};

