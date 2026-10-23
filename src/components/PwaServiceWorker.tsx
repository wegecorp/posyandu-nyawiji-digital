'use client';

import { useEffect } from 'react';

/**
 * Mendaftarkan service worker (public/sw.js) dan menangani pemulihan
 * otomatis jika terjadi ChunkLoadError saat deployment baru.
 */
export function PwaServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Recovery otomatis jika aset chunk lama 404 (ChunkLoadError setelah build baru)
    const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const msg = 'message' in event ? event.message : String(event.reason);
      if (
        msg &&
        (msg.includes('Loading chunk') ||
          msg.includes('ChunkLoadError') ||
          msg.includes('Failed to fetch dynamically imported module'))
      ) {
        const lastReload = Number(sessionStorage.getItem('nyawiji_chunk_reload') || '0');
        if (Date.now() - lastReload > 10000) {
          sessionStorage.setItem('nyawiji_chunk_reload', String(Date.now()));
          // Unregister semua service worker dan bersihkan caches lalu reload halaman dari server
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
              regs.forEach((r) => r.unregister());
            });
          }
          if ('caches' in window) {
            caches.keys().then((keys) => {
              keys.forEach((k) => caches.delete(k));
            });
          }
          window.location.reload();
        }
      }
    };

    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', handleChunkError);

    // 2. Registrasi service worker hanya di production
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('error', handleChunkError);
        window.removeEventListener('unhandledrejection', handleChunkError);
      };
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Cek pembaruan segera setelah daftar
          reg.update().catch(() => {});
        })
        .catch((err) => console.error('Gagal mendaftarkan service worker:', err));
    };

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad);
    }

    // Cek pembaruan saat tab HP dibuka kembali dari background
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => reg.update().catch(() => {}));
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleChunkError);
      window.removeEventListener('load', onLoad);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
}
