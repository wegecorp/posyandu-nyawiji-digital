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
  Edit3,
} from 'lucide-react';

interface PatientCardProps {
  patient: PatientData;
  isSelected?: boolean;
  onSelect: (patient: PatientData) => void;
  onShowQR: (e: React.MouseEvent, patient: PatientData) => void;
  onEdit?: (patient: PatientData) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  isSelected = false,
  onSelect,
  onShowQR,
  onEdit,
}) => {
  const category = patient.category || 'BALITA';
  const badge = getCategoryBadge(category);
  const isMeasuredToday = Boolean(patient.todayMeasurement);
  const isComplete = Boolean(patient.measurementComplete);

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

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (onEdit) onEdit(patient);
  };

  return (
    <div
      onClick={() => onSelect(patient)}
      className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer touch-press relative flex items-center justify-between gap-2.5 shadow-xs ${
        isSelected
          ? 'bg-[#e7fceb] border-[#25d366] ring-1 ring-[#25d366]/40'
          : 'bg-white hover:bg-[#f0f2f5] border-[#e9edef]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
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

        {/* Info Pasien */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[#111b21] text-sm sm:text-base truncate leading-snug">
              {patient.name}
            </h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.color}`}>
              {badge.label}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#54656f] mt-0.5 flex-wrap">
            <span className="text-xs font-normal">• {patient.ageDisplay}</span>
          </div>

          {/* Status Ukur Hari Ini */}
          <div className="mt-1 flex items-center gap-2">
            {isComplete ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0f766e] bg-[#f0fdf4] px-2.5 py-0.5 rounded-full border border-[#bbf7d0]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a]" />
                <span>
                  Sudah diukur
                  {patient.todayMeasurement?.weight
                    ? ` (${patient.todayMeasurement.weight} kg)`
                    : ''}
                </span>
              </span>
            ) : isMeasuredToday ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#b45309] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                <CircleDashed className="w-3.5 h-3.5 text-[#d97706]" />
                <span>Diukur sebagian (BB/TB belum lengkap)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#c2410c] bg-[#fff7ed] px-2.5 py-0.5 rounded-full border border-[#ffedd5]">
                <CircleDashed className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>Belum diukur hari ini</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Direct Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={(e) => onShowQR(e, patient)}
          className="w-8 h-8 flex items-center justify-center text-[#54656f] hover:text-[#075e54] rounded-full hover:bg-[#f0f2f5] transition-all"
          title="QR Code Pasien"
        >
          <QrCode className="w-4.5 h-4.5" />
        </button>

        {onEdit && (
          <button
            onClick={handleEdit}
            className="w-8 h-8 flex items-center justify-center text-[#54656f] hover:text-[#075e54] rounded-full hover:bg-[#f0f2f5] transition-all"
            title="Edit Data Pasien"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}

        <div className="w-8 h-8 rounded-full bg-[#075e54] text-white flex items-center justify-center shadow-xs">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
