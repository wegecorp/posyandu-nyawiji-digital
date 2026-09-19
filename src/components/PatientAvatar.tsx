'use client';

import React, { useState } from 'react';
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
  const cleanName = (name || 'pasien').trim();
  const isBaby = category === 'BAYI' || category === 'BALITA_APRAS';
  const isElderly = category === 'LANSIA';
  const isFemale = gender === 'P' || category === 'BUMIL';

  // Generate DiceBear URL berdasarkan kategori
  const getAvatarUrl = () => {
    if (isBaby) {
      // Bayi & Balita: Moods khusus ceria & positif (tanpa ekspresi marah/sedih)
      const eyes = 'happy,calm,bigPupils,sparkle,wink,pupils';
      const mouths = 'bigSmile,smile,smileOpen,grin,laugh,cat,tongue';
      return `https://api.dicebear.com/10.x/moods/svg?seed=${encodeURIComponent(cleanName)}&eyesVariant=${eyes}&mouthVariant=${mouths}`;
    }

    // Remaja s/d Lansia & Bumil: Dylan (karakter ilustrasi tegas & modern)
    if (isElderly) {
      // Lansia: Rambut putih / abu-abu beruban, ekspresi hangat
      const whiteHair = 'cbd5e1,ffffff,e2e8f0,94a3b8';
      const elderlyHairVariants = 'plain,parting,roundBob,buns,flatTop';
      const facialHair = gender === 'L' ? 30 : 0;
      return `https://api.dicebear.com/10.x/dylan/svg?seed=${encodeURIComponent(cleanName)}&hairColor=${whiteHair}&hairVariant=${elderlyHairVariants}&moodVariant=happy,hopeful,neutral&backgroundColor=f1f5f9,e2e8f0&facialHairProbability=${facialHair}`;
    }

    if (isFemale) {
      // Perempuan & Ibu Hamil: Rambut panjang/bob/curls, tanpa kumis, latar pink/rose
      const femaleHair = 'bangs,buns,longCurls,roundBob,wavy,fluffy';
      return `https://api.dicebear.com/10.x/dylan/svg?seed=${encodeURIComponent(cleanName)}&hairVariant=${femaleHair}&facialHairProbability=0&backgroundColor=fce7f3,fecdd3,fff1f2&moodVariant=happy,hopeful,neutral,superHappy`;
    }

    // Laki-laki (Remaja / Dewasa): Rambut pendek/spiky/flat, latar biru/sky
    const maleHair = 'flatTop,parting,plain,shaggy,shortCurls,spiky';
    const facialHair = category === 'REMAJA' ? 0 : 40;
    return `https://api.dicebear.com/10.x/dylan/svg?seed=${encodeURIComponent(cleanName)}&hairVariant=${maleHair}&facialHairProbability=${facialHair}&backgroundColor=e0f2fe,bae6fd,e0f7ff&moodVariant=happy,hopeful,neutral,superHappy`;
  };

  if (!imgError) {
    return (
      <div
        className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-[#f0f2f5] border ${
          isFemale ? 'border-rose-200' : isElderly ? 'border-amber-200' : 'border-sky-200'
        } ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getAvatarUrl()}
          alt={cleanName}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Fallback offline: Boring Avatars varian beam
  const colors = isBaby
    ? BABY_FALLBACK_PALETTE
    : isFemale
    ? FEMALE_PALETTE
    : gender === 'L'
    ? MALE_PALETTE
    : DEFAULT_PALETTE;

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center border shadow-2xs ${
        isFemale ? 'border-rose-200' : 'border-sky-200'
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
