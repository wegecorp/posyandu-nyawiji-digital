/**
 * Progres berat badan antar-kunjungan (KMS): Naik / Tidak Naik (N/T) dan 2T.
 *
 * Aturan (hasil grilling, lihat docs/audit-visualisasi.md §4):
 * - Bandingkan dengan pengukuran terukur sebelumnya (weight != null).
 * - `TIDAK_NAIK` bila berat sekarang <= sebelumnya (termasuk flat).
 * - `2T` = dua hasil `TIDAK_NAIK` berturut-turut pada pengukuran yang ada.
 * - Tanpa pembanding (pengukuran pertama) → status null (belum dapat dinilai).
 *
 * Murni (tanpa Prisma/React) sehingga dapat dipakai server & klien.
 */

export type WeightStatus = 'NAIK' | 'TIDAK_NAIK';

export interface WeightProgression {
  /** Delta berat (kg) vs pengukuran sebelumnya; null bila tak dapat dinilai. */
  gain: number | null;
  /** N/T; null bila tak ada pembanding. */
  status: WeightStatus | null;
  /** Dua kali Tidak Naik berturut-turut → penanda rujuk. */
  faltering2T: boolean;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round(v: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
}

/**
 * Hitung progres satu pengukuran terhadap pengukuran terukur sebelumnya.
 *
 * @param prevWeight  Berat pengukuran terukur sebelumnya (null bila belum ada).
 * @param currentWeight Berat pengukuran ini.
 * @param prevStatus  `weightStatus` pengukuran sebelumnya (untuk rantai 2T).
 */
export function computeWeightProgression(
  prevWeight: number | null | undefined,
  currentWeight: number | null | undefined,
  prevStatus?: string | null,
): WeightProgression {
  const prev = num(prevWeight);
  const cur = num(currentWeight);
  if (prev == null || cur == null) {
    return { gain: null, status: null, faltering2T: false };
  }
  const status: WeightStatus = cur > prev ? 'NAIK' : 'TIDAK_NAIK';
  const faltering2T = status === 'TIDAK_NAIK' && prevStatus === 'TIDAK_NAIK';
  return { gain: round(cur - prev, 2), status, faltering2T };
}

/** Label singkat untuk ditampilkan (N / T / —). */
export function weightStatusShort(status?: string | null): string {
  if (status === 'NAIK') return 'N';
  if (status === 'TIDAK_NAIK') return 'T';
  return '—';
}
