'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { APP_NAME } from '@/lib/branding';
import { MapPin, Building2, CheckCircle2 } from 'lucide-react';

interface LocationHeroStatProps {
  statusCounts: {
    total: number;
    none: number;
    partial: number;
    full: number;
    measured: number;
    percent: number;
  };
}

export const LocationHeroStat: React.FC<LocationHeroStatProps> = ({ statusCounts }) => {
  const { user } = useAuth();
  const [imgError, setImgError] = useState(false);

  const posyanduName = user?.posyanduName || (user?.role === 'POSYANDU' ? user.name : '') || APP_NAME;
  const landscapeUrl = `https://api.dicebear.com/10.x/landscape/svg?seed=${encodeURIComponent(posyanduName)}`;

  return (
    <div className="bg-white rounded-2xl border border-[#e9edef] p-3.5 sm:p-4 shadow-xs space-y-3 transition-all">
      {/* Header Identitas Lokasi */}
      <div className="flex items-center gap-3">
        {/* Avatar Landscape Generator */}
        <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-[#bbf7d0] bg-[#e7fceb] shadow-xs flex items-center justify-center relative">
          {!imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={landscapeUrl}
              alt={posyanduName}
              width={48}
              height={48}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform hover:scale-105"
            />
          ) : (
            <Building2 className="w-6 h-6 text-[#075e54]" />
          )}
        </div>

        {/* Info Lokasi / Unit */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-[#54656f] font-semibold">
            <MapPin className="w-3.5 h-3.5 text-[#128c7e] shrink-0" />
            <span className="truncate">Pos Layanan Posyandu</span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#111b21] truncate leading-tight mt-0.5">
            {posyanduName}
          </h2>
        </div>
      </div>

      {/* Ringkasan Partisipasi Pengukuran Bulan Ini */}
      <div className="bg-[#f0fdf4] rounded-xl border border-[#dcfce7] p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-[#166534] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a]" />
            <span>
              Terisi bulan ini:{' '}
              <strong className="text-[#15803d]">
                {statusCounts.measured}/{statusCounts.total}
              </strong>{' '}
              pasien
            </span>
          </span>
          <span className="text-[#15803d] font-extrabold">{statusCounts.percent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-[#dcfce7] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#25d366] rounded-full transition-[width] duration-500 ease-out shadow-xs"
            style={{ width: `${statusCounts.percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
