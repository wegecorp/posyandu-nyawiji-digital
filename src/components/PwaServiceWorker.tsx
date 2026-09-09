'use client';

import { useEffect } from 'react';

/**
 * Mendaftarkan service worker (public/sw.js).
 * Hanya di production — di mode `next dev` service worker bisa membuat
 * cache basi dan mengganggu hot-reload.
 */
export function PwaServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.error('Gagal mendaftarkan service worker:', err));
    };

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad);
    }

    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
