/* PORTAL NYAWIJI — Service Worker
 *
 * Tujuan:
 *  1. Memenuhi syarat "installable PWA" (wajib ada fetch handler).
 *  2. Menyediakan app-shell luring ringan: halaman bisa dibuka ulang
 *     saat tanpa internet. Data tetaplah dikelola aplikasi (offline-sync),
 *     API TIDAK pernah di-cache agar tidak menampilkan data basi.
 *
 * Saat versi berubah, cukup naikkan VERSION untuk membersihkan cache lama.
 */
const VERSION = '2026.09-v3';
const APP_SHELL_CACHE = `nyawiji-shell-${VERSION}`;
const STATIC_CACHE = `nyawiji-static-${VERSION}`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== APP_SHELL_CACHE && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Hanya tangani GET. POST/PUT/DELETE (login, autosave, sinkron) dibiarkan apa adanya.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Jangan sentuh permintaan lintas-origin.
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // API: SELALU lewat jaringan. Tidak pernah di-cache — datanya sensitif
  // dan aplikasi sudah punya mekanisme luring (queue sinkron) sendiri.
  if (path.startsWith('/api/')) return;

  // Navigasi halaman (HTML aplikasi): network-first, fallback ke shell terakhir.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put('/', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches
            .open(APP_SHELL_CACHE)
            .then((cache) => cache.match('/') || cache.match(request.url))
        )
    );
    return;
  }

  // Aset build Next.js (_next/static/*) immutable & ber-hash: cache dulu,
  // tapi tetap perbarui di latar belakang bila ada versi jaringan lebih baru.
  if (path.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Aset kecil lainnya (logo, manifest, ikon): stale-while-revalidate.
  if (/\.(png|jpe?g|svg|webp|gif|ico|json|txt|css|js|woff2?)$/.test(path)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }
});
