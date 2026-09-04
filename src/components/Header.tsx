'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Activity,
  QrCode,
  UserPlus,
  Wifi,
  WifiOff,
  Building2,
  Building,
  FileSpreadsheet,
  RefreshCw,
  LogOut,
  ChevronDown,
  Lock,
  LayoutDashboard,
} from 'lucide-react';
import { getSyncQueue } from '@/lib/offline-sync';

interface HeaderProps {
  onOpenRegister: () => void;
  onOpenScanQR: () => void;
  onOpenExport: () => void;
  onOpenLogin: () => void;
  onRefresh: () => void;
  onBackToDashboard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenRegister,
  onOpenScanQR,
  onOpenExport,
  onOpenLogin,
  onRefresh,
  onBackToDashboard,
}) => {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const updateStatus = () => {
      setIsOnline(navigator.onLine);
      setUnsyncedCount(getSyncQueue().length);
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    const interval = setInterval(updateStatus, 3000);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      clearInterval(interval);
    };
  }, []);

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'DINKES':
        return { label: 'DINAS KESEHATAN GK', color: 'bg-[#8b5cf6] text-white' };
      case 'PUSKESMAS':
        return { label: 'PUSKESMAS', color: 'bg-[#0284c7] text-white' };
      case 'POSYANDU':
        return { label: 'POSYANDU', color: 'bg-[#10b981] text-white' };
      default:
        return { label: 'TIDAK TERAUTENTIKASI', color: 'bg-[#0f172a] text-white' };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e2e8f0] shadow-xs">
      {/* Top Banner / Status Bar */}
      <div className="bg-[#0f172a] text-white px-3.5 py-1.5 text-xs flex items-center justify-between font-medium">
        <div className="flex items-center gap-2 truncate">
          <span className="inline-block w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
          <span className="truncate font-bold tracking-tight">Posyandu Digital Gunungkidul</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider ${roleBadge.color}`}>
            {roleBadge.label}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] shrink-0">
          {/* Online/Offline Badge */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isOnline ? 'bg-[#10b981]/20 text-[#34d399]' : 'bg-[#ef4444]/20 text-[#f87171]'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3 text-[#34d399]" /> : <WifiOff className="w-3 h-3 text-[#f87171]" />}
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {unsyncedCount > 0 && (
            <span className="bg-[#fbbf24] text-[#0f172a] px-2 py-0.5 rounded-full text-[10px] font-bold">
              {unsyncedCount} antrean
            </span>
          )}
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 max-w-2xl mx-auto">
        {/* Account Info Button */}
        <button
          onClick={onOpenLogin}
          className="flex items-center gap-2.5 text-left bg-[#f0f7ff] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded-full px-3 py-1.5 transition-all text-xs touch-press"
        >
          <div
            className={`w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
              user?.role === 'DINKES'
                ? 'bg-[#8b5cf6]'
                : user?.role === 'PUSKESMAS'
                ? 'bg-[#0284c7]'
                : 'bg-[#10b981]'
            }`}
          >
            {user?.role === 'DINKES' ? 'DK' : user?.role === 'PUSKESMAS' ? 'PK' : 'PS'}
          </div>
          <div className="truncate max-w-[130px] sm:max-w-[200px]">
            <div className="font-bold text-[#0f172a] truncate text-[13px] leading-tight">
              {user?.name || user?.posyanduName || 'Belum Login'}
            </div>
            <div className="text-[11px] text-[#64748b] truncate leading-tight flex items-center gap-1 font-mono">
              <span>user: {user?.username || 'tamu'}</span>
              <ChevronDown className="w-3 h-3 inline text-[#94a3b8]" />
            </div>
          </div>
        </button>

        {/* Action Buttons (Pill Buttons per DESIGN.md) */}
        <div className="flex items-center gap-2">
          {/* If user is Puskesmas or Dinkes and currently inside a Posyandu table, show button to return to dashboard */}
          {(user?.role === 'PUSKESMAS' || user?.role === 'DINKES') && onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 bg-[#f0f7ff] hover:bg-[#e2e8f0] text-[#0f172a] font-bold px-3.5 py-2 rounded-full text-xs border border-[#cbd5e1] shadow-xs transition-all touch-press"
              title="Kembali ke Dashboard Utama"
            >
              <LayoutDashboard className="w-4 h-4 text-[#8b5cf6]" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}

          {/* Scan QR Button */}
          <button
            onClick={onOpenScanQR}
            aria-label="Scan QR Pasien"
            className="w-10 h-10 text-[#0f172a] bg-[#f0f7ff] hover:bg-[#e2e8f0] rounded-full transition-all touch-press flex items-center justify-center border border-[#cbd5e1] shrink-0"
            title="Scan QR Pasien"
          >
            <QrCode className="w-4.5 h-4.5 text-[#0284c7]" />
          </button>

          {/* Export Excel Button */}
          <button
            onClick={onOpenExport}
            aria-label="Export Rekap Excel"
            className="w-10 h-10 text-[#0f172a] bg-[#f0f7ff] hover:bg-[#e2e8f0] rounded-full transition-all touch-press flex items-center justify-center border border-[#cbd5e1] shrink-0"
            title="Export Excel Rekap"
          >
            <FileSpreadsheet className="w-4.5 h-4.5 text-[#10b981]" />
          </button>

          {/* Register Patient Button (Cobalt Pill Primary CTA per DESIGN.md) */}
          <button
            onClick={onOpenRegister}
            className="flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold px-4 py-2 rounded-full text-xs shadow-xs transition-all touch-press"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden xs:inline">Daftar</span> Pasien
          </button>
        </div>
      </div>
    </header>
  );
};

