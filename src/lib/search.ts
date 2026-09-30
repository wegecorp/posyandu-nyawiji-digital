// Helper pencarian cerdas & toleran untuk unit kesehatan (Posyandu & Puskesmas).
import { romanToNumber } from './names';

const STOPWORDS = new Set(['posyandu', 'pos', 'pkm', 'puskesmas', 'desa', 'kalurahan', 'padukuhan', 'dusun']);

const ARABIC_TO_ROMAN: Record<string, string> = {
  '1': 'i',
  '2': 'ii',
  '3': 'iii',
  '4': 'iv',
  '5': 'v',
  '6': 'vi',
  '7': 'vii',
  '8': 'viii',
  '9': 'ix',
  '10': 'x',
};

/**
 * Pecah query jadi token pencarian yang relevan.
 * Mengabaikan stopword umum jika ada kata kunci spesifik lain.
 */
export function extractSearchTokens(query: string): string[] {
  const raw = query.toLowerCase().trim();
  if (!raw) return [];

  const words = raw.split(/\s+/).filter(Boolean);
  const meaningful = words.filter((w) => !STOPWORDS.has(w));
  return meaningful.length > 0 ? meaningful : words;
}

/**
 * Cek apakah string target cocok dengan token pencarian tunggal.
 * Mendukung pencocokan silang angka arab & romawi (misal: '1' cocok dengan 'I' atau '01').
 */
export function matchToken(target: string, token: string): boolean {
  if (target.includes(token)) return true;

  // Cek nomor arab -> romawi / padded (1 -> i, 01)
  if (/^\d+$/.test(token)) {
    const num = parseInt(token, 10);
    const roman = ARABIC_TO_ROMAN[String(num)];
    if (roman) {
      // Pastikan kata romawi berdiri sendiri atau dipisahkan spasi/tanda baca
      const regex = new RegExp(`\\b${roman}\\b`, 'i');
      if (regex.test(target)) return true;
    }

    const padded = token.length === 1 ? `0${token}` : '';
    if (padded && target.includes(padded)) return true;
  }

  // Cek romawi -> arab (i -> 1, 01)
  const arabic = romanToNumber(token);
  if (arabic !== null) {
    const arabStr = String(arabic);
    if (target.includes(arabStr)) return true;
    const padded = arabStr.length === 1 ? `0${arabStr}` : '';
    if (padded && target.includes(padded)) return true;
  }

  return false;
}

/**
 * Cek apakah string gabungan data cocok dengan query pencarian.
 * Semua token yang diekstrak dari query harus cocok.
 */
export function matchSearchQuery(targetText: string, query: string): boolean {
  const tokens = extractSearchTokens(query);
  if (tokens.length === 0) return true;

  const normalizedTarget = targetText.toLowerCase();
  return tokens.every((token) => matchToken(normalizedTarget, token));
}
