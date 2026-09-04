'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PatientData } from '@/lib/types';
import { getCategoryBadge } from '@/lib/utils';
import {
  ChevronRight,
  CheckCircle2,
  CircleDashed,
  QrCode,
  User,
  MoreVertical,
  Edit3,
  Trash2,
  ClipboardList,
} from 'lucide-react';

interface PatientCardProps {
  patient: PatientData;
  isSelected?: boolean;
  onSelect: (patient: PatientData) => void;
  onShowQR: (e: React.MouseEvent, patient: PatientData) => void;
  onEdit?: (patient: PatientData) => void;
  onDelete?: (patient: PatientData) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  isSelected = false,
  onSelect,
  onShowQR,
  onEdit,
  onDelete,
}) => {
  const category = patient.category || 'BALITA';
  const badge = getCategoryBadge(category);
  const isMeasuredToday = Boolean(patient.todayMeasurement);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleInputAndHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onSelect(patient);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (onEdit) onEdit(patient);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (onDelete) onDelete(patient);
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <div
      onClick={() => onSelect(patient)}
      className={`p-4 rounded-[20px] border transition-all cursor-pointer touch-press relative flex items-center justify-between gap-3 ${
        isSelected
          ? 'bg-[#0284c7]/5 border-[#0284c7] shadow-sm ring-2 ring-[#0284c7]/20'
          : 'bg-white hover:bg-[#f0f7ff] border-[#e2e8f0] shadow-xs'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
            patient.gender === 'P'
              ? 'bg-rose-50 text-rose-600 border-rose-200'
              : 'bg-sky-50 text-sky-600 border-sky-200'
          }`}
        >
          <User className="w-5 h-5" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-[#0f172a] text-sm truncate leading-tight">
              {patient.name}
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
              {badge.label}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#64748b] mt-1 flex-wrap font-medium">
            <span className="font-mono text-[11px] text-[#0f172a] font-bold bg-[#f0f7ff] px-1.5 py-0.5 rounded-md border border-[#e2e8f0]">
              {patient.regNumber}
            </span>
            <span>• {patient.ageDisplay}</span>
          </div>

          {/* Measurement summary status for today */}
          <div className="mt-2 flex items-center gap-2">
            {isMeasuredToday ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#10b981] bg-[#10b981]/10 px-2.5 py-0.5 rounded-full border border-[#10b981]/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                <span>
                  Sudah diukur
                  {patient.todayMeasurement?.weight
                    ? ` (BB: ${patient.todayMeasurement.weight}kg)`
                    : ''}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0f172a] bg-[#f59e0b]/20 px-2.5 py-0.5 rounded-full border border-[#f59e0b]/40">
                <CircleDashed className="w-3.5 h-3.5 text-[#f59e0b]" />
                <span>Belum diukur hari ini</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1 shrink-0 relative" ref={menuRef}>
        {/* QR Code Button */}
        <button
          onClick={(e) => onShowQR(e, patient)}
          className="w-8 h-8 flex items-center justify-center text-[#64748b] hover:text-[#0284c7] rounded-full hover:bg-[#f0f7ff] transition-all"
          title="QR Code Pasien"
        >
          <QrCode className="w-4 h-4" />
        </button>

        {/* Action Menu Popover Button (Three Dots) */}
        <button
          onClick={toggleMenu}
          className={`w-8 h-8 flex items-center justify-center text-[#64748b] rounded-full transition-all ${
            isMenuOpen ? 'bg-[#0284c7]/10 text-[#0284c7]' : 'hover:bg-[#f0f7ff] hover:text-[#0f172a]'
          }`}
          title="Menu Aksi Pasien"
        >
          <MoreVertical className="w-4.5 h-4.5" />
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute right-0 top-10 z-40 bg-white rounded-2xl shadow-xl border border-[#cbd5e1] py-1.5 w-48 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={handleInputAndHistory}
              className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#0f172a] hover:bg-[#f0f7ff] flex items-center gap-2.5 transition-all"
            >
              <ClipboardList className="w-4 h-4 text-[#0284c7]" />
              <span>Input & Riwayat</span>
            </button>
            {onEdit && (
              <button
                onClick={handleEdit}
                className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#0f172a] hover:bg-[#f0f7ff] flex items-center gap-2.5 transition-all"
              >
                <Edit3 className="w-4 h-4 text-[#0284c7]" />
                <span>Edit Data Pasien</span>
              </button>
            )}
            {onDelete && (
              <div className="border-t border-[#e2e8f0] my-1 pt-1">
                <button
                  onClick={handleDelete}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#ef4444] hover:bg-rose-50 flex items-center gap-2.5 transition-all"
                >
                  <Trash2 className="w-4 h-4 text-[#ef4444]" />
                  <span>Hapus Pasien</span>
                </button>
              </div>
            )}
          </div>
        )}

        <ChevronRight className={`w-5 h-5 ${isSelected ? 'text-[#0284c7]' : 'text-[#94a3b8]'}`} />
      </div>
    </div>
  );
};
