'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { X, FileSpreadsheet, Download } from 'lucide-react';

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
      <div className="bg-white w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden border border-[#e9edef]">
        <div className="bg-[#075e54] text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[#25d366]" />
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
          <div className="bg-[#f0f2f5] p-3.5 rounded-2xl border border-[#e9edef] space-y-2 text-xs text-[#54656f] font-medium">
            <div className="flex justify-between">
              <span>Posyandu:</span>
              <strong className="text-[#111b21]">{user?.posyanduName || 'Semua Data'}</strong>
            </div>
            <div className="flex justify-between">
              <span>Puskesmas:</span>
              <strong className="text-[#111b21]">{user?.healthCenterName || 'Kab. Gunungkidul'}</strong>
            </div>
            <div className="flex justify-between">
              <span>Format:</span>
              <span className="font-bold text-[#128c7e]">Microsoft Excel (.xlsx)</span>
            </div>
          </div>

          <p className="text-xs text-[#54656f] leading-relaxed">
            Data mentah seluruh pengukuran (BB, TB, Lingkar Kepala, LiLA, Tensi, Catatan, dan Nama Kader) akan diexport dalam format tabel Excel siap setor ke Puskesmas.
          </p>

          <div className="pt-2 flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#111b21] font-bold rounded-full text-xs transition-all touch-press border border-[#e9edef]"
            >
              Tutup
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={isExporting}
              className="flex-2 py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-xs shadow-md flex items-center justify-center gap-2 transition-all touch-press"
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

