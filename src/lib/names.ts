// Helper normalisasi nama & username — murni fungsi, aman dipakai client/server.

const ROMAN_VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

const MAX_ROMAN = 39; // cukup untuk penomoran puskesmas/posyandu (I s.d. XXXIX)

/** Konversi angka romawi (I..XXXIX) ke angka arab. Kembalikan null bila bukan angka romawi valid. */
export function romanToNumber(token: string): number | null {
  const u = String(token).toUpperCase();
  if (!/^[IVXLCDM]+$/.test(u)) return null;
  let total = 0;
  let prev = 0;
  for (let i = u.length - 1; i >= 0; i--) {
    const v = ROMAN_VALUES[u[i]];
    if (v < prev) total -= v;
    else {
      total += v;
      prev = v;
    }
  }
  return total >= 1 && total <= MAX_ROMAN ? total : null;
}

/**
 * Title-case yang aman untuk angka romawi.
 * 'PUSKESMAS WONOSARI II' -> 'Puskesmas Wonosari II' (bukan '... Ii').
 * Kata yang berupa angka romawi (I, II, III, IV, ...) dipertahankan huruf kapital.
 */
export function smartTitle(s: string): string {
  return String(s)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (romanToNumber(word) !== null) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Basis username puskesmas dari nama, tanpa prefix 'pkm_'.
 * - Mengabaikan kata 'Puskesmas'.
 * - Angka romawi di akhir nama (I/II/III/IV/...) menjadi angka arab.
 * 'Puskesmas Wonosari I' -> 'wonosari1' ; 'Puskesmas Semanu II' -> 'semanu2'
 */
export function puskesmasUsernameBase(name: string): string {
  const words = String(name)
    .replace(/\bpuskesmas\b/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let seq = 1;
  const tail = [...words];
  const last = tail[tail.length - 1];
  if (last !== undefined) {
    const n = romanToNumber(last);
    if (n !== null) {
      seq = n;
      tail.pop();
    }
  }
  const core = tail.join('').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${core}${seq}`;
}
