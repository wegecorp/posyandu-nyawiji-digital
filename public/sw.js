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
const VERSION = '2026.09-v9';
const APP_SHELL_CACHE = `nyawiji-shell-${VERSION}`;
const STATIC_CACHE = `nyawiji-static-${VERSION}`;

const PRECACHE_ASSETS = ['/brand/logo.svg', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch(() => {})
  );
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

  // Jangan sentuh permintaan lintas-origin
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // API: SELALU lewat jaringan. Tidak pernah di-cache — datanya sensitif
  // dan aplikasi sudah punya mekanisme luring (queue sinkron) sendiri.
  if (path.startsWith('/api/')) return;

  // Navigasi halaman (HTML aplikasi): network-first murni dengan fallback ke shell cache jika offline.
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
        .catch(async () => {
          const cached = await caches.open(APP_SHELL_CACHE).then((cache) => cache.match('/'));
          if (cached) return cached;
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Portal Nyawiji - Offline</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f0f2f5;color:#111b21;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:1rem;box-sizing:border-box}.card{background:#fff;border-radius:1.5rem;padding:2rem;max-width:380px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.08);border:1px solid #e9edef}h2{color:#075e54;margin:0 0 .5rem}p{color:#54656f;font-size:14px;line-height:1.5;margin:0 0 1.5rem}button{background:#128c7e;color:#fff;border:none;padding:.75rem 1.5rem;font-weight:700;border-radius:9999px;cursor:pointer;font-size:14px}</style></head><body><div class="card"><h2>Anda Sedang Offline</h2><p>Aplikasi tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.</p><button onclick="window.location.reload()">Muat Ulang</button></div></body></html>',
            {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
          );
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
