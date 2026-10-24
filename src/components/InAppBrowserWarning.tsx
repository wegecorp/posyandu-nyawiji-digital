'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';

export function InAppBrowserWarning() {
  const [isInApp, setIsInApp] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    // Cek apakah dibuka di in-app browser (WhatsApp, FB, Instagram, Line, TikTok)
    const ua = navigator.userAgent || '';
    const isInsideApp = /WhatsApp|FBAN|FBAV|Instagram|Line|ByteLocale|TikTok/i.test(ua);
    let wasDismissed = false;
    try {
      wasDismissed = sessionStorage.getItem('nyawiji_inapp_dismissed') === '1';
    } catch {}

    if (isInsideApp && !wasDismissed) {
      setIsInApp(true);
      setDismissed(false);
    }
  }, []);

  if (!isInApp || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('nyawiji_inapp_dismissed', '1');
    } catch {}
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-center justify-between gap-2 z-50">
      <div className="flex items-center gap-2 flex-1">
        <ExternalLink className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          Aplikasi dibuka di browser bawaan WhatsApp/media sosial. Jika tombol macet atau gagal login, klik titik tiga (<strong>⋮</strong>) di kanan atas lalu pilih <strong>Buka di Chrome / Browser</strong>.
        </span>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="p-1 text-amber-600 hover:text-amber-800 rounded shrink-0 cursor-pointer"
        aria-label="Tutup pemberitahuan"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
