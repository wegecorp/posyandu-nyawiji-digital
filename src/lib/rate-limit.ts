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

/** Ekstrak identitas klien (IP) dari request utk dipakai sbg rate-limit key. */
export function getClientKey(req: Request, salt = ''): string {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  return `${salt}:${ip}`;
}
