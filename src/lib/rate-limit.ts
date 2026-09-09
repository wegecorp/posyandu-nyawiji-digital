// Rate limiter in-memory sederhana (cukup utk tahap awal / single instance).
// Struktur: Map<key, number[] timestamps>. Prune saat diakses.

const buckets = new Map<string, number[]>();

export interface RateLimitOptions {
  key: string;
  limit: number; // jumlah maksimum dalam jendela
  windowMs: number; // panjang jendela
}

/** Return true jika request HARUS ditolak (melewati batas). */
export function isRateLimited({ key, limit, windowMs }: RateLimitOptions): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  const hits = (buckets.get(key) || []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return true;
  }

  hits.push(now);
  buckets.set(key, hits);
  return false;
}

/**
 * Ekstrak identitas klien (IP) utk dipakai sbg rate-limit key.
 * Pakai entri PALING KANAN dari X-Forwarded-For: Nginx menimpa/menambahkannya dengan IP
 * asli klien, jadi bagian kiri yang dikirim pemohon bisa di-spoof — bagian kanan tidak.
 */
export function getClientKey(req: Request, salt = ''): string {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
  const ip = parts.length > 0 ? parts[parts.length - 1] : req.headers.get('x-real-ip') || 'unknown';
  return `${salt}:${ip}`;
}
