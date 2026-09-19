'use client';

import React, { useState } from 'react';
import Avatar from 'boring-avatars';

interface PatientAvatarProps {
  name: string;
  gender?: 'L' | 'P' | string;
  category?: string;
  size?: number;
  className?: string;
}

const MALE_PALETTE = ['#0284c7', '#0369a1', '#38bdf8', '#bae6fd', '#075e54'];
const FEMALE_PALETTE = ['#e11d48', '#f43f5e', '#fb7185', '#fecdd3', '#fda4af'];
const BABY_FALLBACK_PALETTE = ['#fb7185', '#fdba74', '#fef08a', '#86efac', '#67e8f9'];
const DEFAULT_PALETTE = ['#075e54', '#128c7e', '#25d366', '#34b7f1', '#ece5dd'];

export const PatientAvatar: React.FC<PatientAvatarProps> = ({
  name,
  gender,
  category,
  size = 40,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const isBaby = category === 'BAYI' || category === 'BALITA_APRAS';
  const cleanName = (name || 'pasien').trim();

  // Bayi & Balita: gunakan DiceBear Moods (ekspresi wajah imut & lembut)
  if (isBaby && !imgError) {
    const dicebearUrl = `https://api.dicebear.com/10.x/moods/svg?seed=${encodeURIComponent(cleanName)}`;
    return (
      <div
        className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-[#f0f2f5] border border-[#e9edef] ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dicebearUrl}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Remaja s/d Lansia & Bumil (atau fallback jika offline): Boring Avatars varian beam
  const colors = isBaby
    ? BABY_FALLBACK_PALETTE
    : gender === 'P'
    ? FEMALE_PALETTE
    : gender === 'L'
    ? MALE_PALETTE
    : DEFAULT_PALETTE;

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center border shadow-2xs ${
        gender === 'P' ? 'border-rose-200' : gender === 'L' ? 'border-sky-200' : 'border-[#e9edef]'
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
};
