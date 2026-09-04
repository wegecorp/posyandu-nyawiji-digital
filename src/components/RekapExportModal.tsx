'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { X, FileSpreadsheet, Download, CheckCircle2 } from 'lucide-react';

interface RekapExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RekapExportModal: React.FC<RekapExportModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const url = `/api/export?posyanduId=${user?.posyanduId || ''}`;
      window.open(url, '_blank');
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1000);
    } catch (e) {
      console.error(e);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden border border-[#dee3e9]">
        <div className="bg-[#0f172a] text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[#10b981]" />
            <h2 className="font-extrabold text-sm">Export Rekap Excel Posyandu</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-[#f0f7ff] p-3.5 rounded-2xl border border-[#e2e8f0] space-y-2 text-xs text-[#64748b] font-medium">
            <div className="flex justify-between">
              <span>Posyandu:</span>
              <strong className="text-[#0f172a]">{user?.posyanduName || 'Semua Data'}</strong>
            </div>
            <div className="flex justify-between">
              <span>Puskesmas:</span>
              <strong className="text-[#0f172a]">{user?.healthCenterName || 'Kab. Gunungkidul'}</strong>
            </div>
            <div className="flex justify-between">
              <span>Format:</span>
              <span className="font-bold text-[#10b981]">Microsoft Excel (.xlsx)</span>
            </div>
          </div>

          <p className="text-xs text-[#64748b] leading-relaxed">
            Data mentah seluruh pengukuran (BB, TB, Lingkar Kepala, LiLA, Tensi, Catatan, dan Nama Kader) akan diexport dalam format tabel Excel siap setor ke Puskesmas.
          </p>

          <div className="pt-2 flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-[#f0f7ff] hover:bg-[#e2e8f0] text-[#0f172a] font-bold rounded-full text-xs transition-all touch-press border border-[#cbd5e1]"
            >
              Tutup
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={isExporting}
              className="flex-2 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-full text-xs shadow-md flex items-center justify-center gap-2 transition-all touch-press"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Mengunduh...' : 'Unduh File Excel'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

