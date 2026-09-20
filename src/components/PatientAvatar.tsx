'use client';

import React from 'react';

interface PatientAvatarProps {
  name?: string | null;
  gender?: 'L' | 'P' | string | null;
  category?: string | null;
  size?: number;
  className?: string;
}

function getInitials(name?: string | null): string {
  const clean = (name || '').trim();
  if (!clean) return 'PS';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  const first = words[0][0];
  const last = words[words.length - 1][0];
  return (first + last).toUpperCase();
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

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

  const hash = hashString(cleanName);
  const initials = getInitials(cleanName);

  let fromColor = '#0284c7';
  let toColor = '#0369a1';
  let borderClass = 'border-sky-200 bg-sky-50';

  if (isBaby) {
    fromColor = '#10b981';
    toColor = '#059669';
    borderClass = 'border-emerald-200 bg-emerald-50';
  } else if (isFemale) {
    fromColor = '#f43f5e';
    toColor = '#e11d48';
    borderClass = 'border-rose-200 bg-rose-50';
  } else if (isElderly) {
    fromColor = '#f59e0b';
    toColor = '#d97706';
    borderClass = 'border-amber-200 bg-amber-50';
  } else if (gender === 'L') {
    fromColor = '#0284c7';
    toColor = '#0369a1';
    borderClass = 'border-sky-200 bg-sky-50';
  } else {
    fromColor = '#0f766e';
    toColor = '#075e54';
    borderClass = 'border-teal-200 bg-teal-50';
  }

  const gradId = `p_avatar_${hash}_${isFemale ? 'f' : isBaby ? 'b' : isElderly ? 'e' : 'm'}`;
  const fontSize = Math.max(10, Math.round(size * 0.42));

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 flex items-center justify-center border shadow-2xs ${borderClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={fromColor} />
            <stop offset="100%" stopColor={toColor} />
          </linearGradient>
        </defs>
        <rect width="40" height="40" fill={`url(#${gradId})`} />
        <circle cx="34" cy="6" r="14" fill="#ffffff" fillOpacity="0.16" />
        <circle cx="6" cy="34" r="10" fill="#ffffff" fillOpacity="0.1" />
        <text
          x="20"
          y="23"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize={fontSize}
          fontWeight="900"
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="-0.5"
        >
          {initials}
        </text>
      </svg>
    </div>
  );
});

PatientAvatar.displayName = 'PatientAvatar';
