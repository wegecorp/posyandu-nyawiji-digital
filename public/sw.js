/* PORTAL NYAWIJI — Service Worker
 *
 * Tujuan:
 *  1. Memenuhi syarat "installable PWA" (wajib ada fetch handler).
 *  2. Menyediakan app-shell luring ringan: halaman bisa dibuka ulang
 *     saat tanpa internet. Data tetaplah dikelola aplikasi (offline-sync),
 *     API TIDAK pernah di-cache agar tidak menampilkan data basi.
 *  3. Caching asset avatar (DiceBear) untuk rendering instan 0ms offline.
 *
 * Saat versi berubah, cukup naikkan VERSION untuk membersihkan cache lama.
 */
const VERSION = '2026.09-v5';
const APP_SHELL_CACHE = `nyawiji-shell-${VERSION}`;
const STATIC_CACHE = `nyawiji-static-${VERSION}`;
const AVATAR_CACHE = `nyawiji-avatars-${VERSION}`;

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
            .filter((key) => key !== APP_SHELL_CACHE && key !== STATIC_CACHE && key !== AVATAR_CACHE)
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

  // Cache-First untuk asset avatar DiceBear (hemat kuota & render instan 0ms)
  if (url.hostname === 'api.dicebear.com') {
    event.respondWith(
      caches.open(AVATAR_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res && res.ok) {
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // Jangan sentuh permintaan lintas-origin selain avatar DiceBear
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // API: SELALU lewat jaringan. Tidak pernah di-cache — datanya sensitif
  // dan aplikasi sudah punya mekanisme luring (queue sinkron) sendiri.
  if (path.startsWith('/api/')) return;

  // Navigasi halaman (HTML aplikasi): network-first dengan timeout 2.5s -> fallback ke shell terakhir.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const networkPromise = fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put('/', copy)).catch(() => {});
          }
          return response;
        });

        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve(null), 2500)
        );

        try {
          const result = await Promise.race([networkPromise, timeoutPromise]);
          if (result) return result;

          // Timeout tercapai: coba ambil dari cache shell instan
          const cached = await caches
            .open(APP_SHELL_CACHE)
            .then((cache) => cache.match('/') || cache.match(request.url));
          if (cached) return cached;

          // Bila belum ada di cache, tunggu respon jaringan
          return await networkPromise;
        } catch {
          const cached = await caches
            .open(APP_SHELL_CACHE)
            .then((cache) => cache.match('/') || cache.match(request.url));
          if (cached) return cached;
          return Response.error();
        }
      })
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
