/**
 * Tabel referensi Standar Antropometri Anak — Permenkes No. 2 Tahun 2020.
 *
 * Angka diekstrak persis dari Lampiran Bab II Peraturan Menteri Kesehatan
 * Republik Indonesia Nomor 2 Tahun 2020 tentang Standar Antropometri Anak
 * (halaman 16-42). Data mentah ada di ./data/*.json (per indeks, per jenis
 * kelamin), berisi 7 garis simpang baku: -3, -2, -1, Median, +1, +2, +3.
 *
 * JANGAN mengubah angka di sini tanpa memperbarui GROWTH_REF_VERSION.
 */

import bbU from './data/bb-u.json';
import pbU from './data/pb-u.json';
import tbU from './data/tb-u.json';
import bbPb from './data/bb-pb.json';
import bbTb from './data/bb-tb.json';
import imtU024 from './data/imt-u-0-24.json';
import imtU2460 from './data/imt-u-24-60.json';

export type Sex = 'L' | 'P';
export type GrowthIndex = 'BB_U' | 'TB_U' | 'BB_TB' | 'IMT_U';
export type GrowthKeyType = 'ageMonths' | 'lengthCm' | 'heightCm';

export interface GrowthRow {
  key: number;
  /** Nilai rujukan pada z = -3, -2, -1, 0, +1, +2, +3. */
  z: number[];
}

export interface GrowthTable {
  keyType: GrowthKeyType;
  rows: GrowthRow[];
  bySex: Record<Sex, GrowthRow[]>;
}

/** Versi modul referensi; dinaikkan setiap tabel diperbarui. */
export const GROWTH_REF_VERSION = 'permenkes-2-2020-v1';

export const Z_LINES = [-3, -2, -1, 0, 1, 2, 3] as const;

interface RawTable {
  keyType: string;
  male: Array<[number, number[]]>;
  female: Array<[number, number[]]>;
}

function toRows(rows: Array<[number, number[]]>): GrowthRow[] {
  return rows
    .map(([key, z]) => ({ key, z }))
    .sort((a, b) => a.key - b.key);
}

function build(raw: unknown): GrowthTable {
  const r = raw as RawTable;
  return {
    keyType: r.keyType as GrowthKeyType,
    rows: toRows(r.male),
    bySex: { L: toRows(r.male), P: toRows(r.female) },
  };
}

export const TABLES = {
  'bb-u': build(bbU),
  'pb-u': build(pbU),
  'tb-u': build(tbU),
  'bb-pb': build(bbPb),
  'bb-tb': build(bbTb),
  'imt-u-0-24': build(imtU024),
  'imt-u-24-60': build(imtU2460),
};

/**
 * Pilih tabel rujukan untuk sebuah indeks.
 * - BB_U  → BB/U (0-60 bln)
 * - TB_U  → PB/U (0-24) atau TB/U (24-60)
 * - BB_TB → BB/PB (0-24, panjang) atau BB/TB (24-60, tinggi)
 * - IMT_U → IMT/U 0-24 atau 24-60
 */
export function tableFor(index: GrowthIndex, sex: Sex, ageMonths: number): { table: GrowthTable; keyType: GrowthKeyType } {
  const young = ageMonths < 24;
  switch (index) {
    case 'BB_U':
      return { table: TABLES['bb-u'], keyType: 'ageMonths' };
    case 'TB_U': {
      const t = young ? TABLES['pb-u'] : TABLES['tb-u'];
      return { table: t, keyType: 'ageMonths' };
    }
    case 'BB_TB': {
      const t = young ? TABLES['bb-pb'] : TABLES['bb-tb'];
      return { table: t, keyType: young ? 'lengthCm' : 'heightCm' };
    }
    case 'IMT_U': {
      const t = young ? TABLES['imt-u-0-24'] : TABLES['imt-u-24-60'];
      return { table: t, keyType: 'ageMonths' };
    }
  }
}

/**
 * Nilai rujukan (7 garis SD) pada titik `key`. Bila tabel berkunci sentimeter
 * dan key tidak persis sama, dilakukan interpolasi linear antar baris.
 */
export function referenceAt(table: GrowthTable, sex: Sex, key: number): number[] {
  const rows = table.bySex[sex];
  if (rows.length === 0) throw new Error(`Tabel rujukan kosong untuk ${sex}`);

  if (key <= rows[0].key) return rows[0].z;
  const last = rows[rows.length - 1];
  if (key >= last.key) return last.z;

  for (let i = 0; i < rows.length - 1; i++) {
    const lo = rows[i];
    const hi = rows[i + 1];
    if (key >= lo.key && key <= hi.key) {
      if (key === lo.key) return lo.z;
      if (key === hi.key) return hi.z;
      const t = (key - lo.key) / (hi.key - lo.key);
      return lo.z.map((v, j) => v + (hi.z[j] - v) * t);
    }
  }
  return last.z;
}

/**
 * Konversi nilai ukur → Z-score dengan interpolasi piecewise pada 7 garis SD,
 * mengikuti metode tabel Permenkes (bukan kurva LMS).
 * Nilai di luar -3/+3 SD diekstrapolasi memakai kemiringan segmen terdekat.
 */
export function zFromReference(value: number, ref: number[]): number {
  if (!Number.isFinite(value)) return NaN;
  const z = Z_LINES;

  if (value <= ref[0]) {
    const slope = (z[1] - z[0]) / (ref[1] - ref[0]);
    return clampZ(z[0] + (value - ref[0]) * slope);
  }
  if (value >= ref[6]) {
    const slope = (z[6] - z[5]) / (ref[6] - ref[5]);
    return clampZ(z[6] + (value - ref[6]) * slope);
  }
  for (let i = 0; i < 6; i++) {
    if (value <= ref[i + 1]) {
      const slope = (z[i + 1] - z[i]) / (ref[i + 1] - ref[i]);
      return clampZ(z[i] + (value - ref[i]) * slope);
    }
  }
  return 0;
}

function clampZ(v: number): number {
  if (!Number.isFinite(v)) return v;
  return Math.max(-5, Math.min(5, v));
}
