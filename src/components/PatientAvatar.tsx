'use client';

import React from 'react';
import Avatar from 'boring-avatars';

interface PatientAvatarProps {
  name?: string | null;
  gender?: 'L' | 'P' | string | null;
  category?: string | null;
  size?: number;
  className?: string;
}

const MALE_PALETTE = ['#0284c7', '#0369a1', '#38bdf8', '#bae6fd', '#075e54'];
const FEMALE_PALETTE = ['#e11d48', '#f43f5e', '#fb7185', '#fecdd3', '#fda4af'];
const BABY_PALETTE = ['#fb7185', '#fdba74', '#fef08a', '#86efac', '#67e8f9'];
const ELDERLY_PALETTE = ['#475569', '#64748b', '#94a3b8', '#cbd5e1', '#d97706'];
const DEFAULT_PALETTE = ['#075e54', '#128c7e', '#25d366', '#34b7f1', '#ece5dd'];

export const PatientAvatar: React.FC<PatientAvatarProps> = React.memo(({
  name,
  gender,
  category,
  size = 40,
  className = '',
}) => {
  const cleanName = (name || 'pasien').trim();
  const isBaby = category === 'BAYI' || category === 'BALITA_APRAS';
  const isElderly = category === 'LANSIA';
  const isFemale = gender === 'P' || category === 'BUMIL';

  const colors = isBaby
    ? BABY_PALETTE
    : isFemale
    ? FEMALE_PALETTE
    : isElderly
    ? ELDERLY_PALETTE
    : gender === 'L'
    ? MALE_PALETTE
    : DEFAULT_PALETTE;

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 flex items-center justify-center border shadow-2xs ${
        isFemale ? 'border-rose-200 bg-rose-50' : isElderly ? 'border-amber-200 bg-amber-50' : isBaby ? 'border-emerald-200 bg-emerald-50' : 'border-sky-200 bg-sky-50'
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <Avatar
        size={size}
        name={cleanName}
        variant="beam"
        colors={colors}
        square={false}
      />
    </div>
  );
});

PatientAvatar.displayName = 'PatientAvatar';
