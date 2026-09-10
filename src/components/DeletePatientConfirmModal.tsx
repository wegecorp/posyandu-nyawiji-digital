'use client';

import React, { useState } from 'react';
import { PatientData } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { useBackLayer } from '@/lib/back-navigation';

interface DeletePatientConfirmModalProps {
  isOpen: boolean;
  patient: PatientData | null;
  onClose: () => void;
  onSuccess: (deletedPatientId: string) => void;
}

export const DeletePatientConfirmModal: React.FC<DeletePatientConfirmModalProps> = ({
  isOpen,
  patient,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useBackLayer(isOpen, onClose);

  if (!isOpen || !patient) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': user?.role || '',
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus data pasien');
      }

      onSuccess(patient.id);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus data pasien');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden border border-[#e9edef] animate-in zoom-in-95 duration-150">
        {/* Danger Header Banner */}
        <div className="bg-[#ef4444] text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-base leading-tight">Konfirmasi Hapus Pasien</h2>
              <p className="text-xs text-white/80 mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-center">
          {errorMsg && (
            <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl text-xs text-[#ef4444] font-bold flex items-center gap-2 text-left">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="w-16 h-16 bg-rose-50 border-2 border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8" />
          </div>

          <div>
            <p className="text-sm text-[#54656f]">Apakah Anda yakin ingin menghapus permanen data pasien berikut?</p>
            <div className="mt-3 p-3 bg-[#f0f2f5] border border-[#e9edef] rounded-2xl">
              <span className="font-extrabold text-base text-[#111b21] block">{patient.name}</span>
              <span className="font-mono text-xs text-[#075e54] font-bold">{patient.regNumber}</span>
              {patient.guardianName && (
                <span className="text-xs text-[#54656f] block mt-0.5">Wali: {patient.guardianName}</span>
              )}
            </div>
            <p className="text-[11px] text-[#ef4444] font-medium mt-3">
              *Seluruh riwayat pengukuran pasien ini juga akan dihapus dari sistem.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-[#f0f2f5] hover:bg-[#e9edef] text-[#111b21] font-bold rounded-full text-xs transition-all touch-press border border-[#e9edef]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 py-3 px-4 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold rounded-full text-xs transition-all shadow-md flex items-center justify-center gap-2 touch-press disabled:opacity-50"
            >
              {isDeleting ? (
                <span>Menghapus...</span>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Ya, Hapus Pasien</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
