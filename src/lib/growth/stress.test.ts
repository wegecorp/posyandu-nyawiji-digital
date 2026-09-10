import { describe, it, expect } from 'vitest';
import {
  TABLES,
  Z_LINES,
  referenceAt,
  zFromReference,
  classifyZ,
  computeGrowth,
  GROWTH_CATEGORIES,
  type GrowthTable,
  type Sex,
} from '@/lib/growth';

const VALID_CATEGORY: Record<string, Set<string>> = {
  BB_U: new Set(GROWTH_CATEGORIES.BB_U.map((c) => c.key)),
  TB_U: new Set(GROWTH_CATEGORIES.TB_U.map((c) => c.key)),
  BB_TB: new Set(GROWTH_CATEGORIES.BB_TB.map((c) => c.key)),
  IMT_U: new Set(GROWTH_CATEGORIES.IMT_U.map((c) => c.key)),
};

const TABLE_NAMES = Object.keys(TABLES) as Array<keyof typeof TABLES>;

describe('integritas tabel referensi', () => {
  for (const name of TABLE_NAMES) {
    const table = TABLES[name] as GrowthTable;
    for (const sex of ['L', 'P'] as Sex[]) {
      it(`${String(name)} ${sex}: 7 nilai, finite, naik tegas`, () => {
        for (const row of table.bySex[sex]) {
          expect(row.z).toHaveLength(7);
          for (let i = 0; i < 7; i++) {
            expect(Number.isFinite(row.z[i]), `${name} ${sex} key=${row.key} z[${i}]=NaN`).toBe(true);
          }
          for (let i = 1; i < 7; i++) {
            expect(
              row.z[i] > row.z[i - 1],
              `${name} ${sex} key=${row.key}: z[${i - 1}]=${row.z[i - 1]} >= z[${i}]=${row.z[i]} (tidak naik tegas)`,
            ).toBe(true);
          }
        }
      });
    }
  }
});

describe('zFromReference', () => {
  for (const name of TABLE_NAMES) {
    const table = TABLES[name] as GrowthTable;
    it(`${String(name)}: tiap nilai SD balik ke Z garisnya`, () => {
      for (const sex of ['L', 'P'] as Sex[]) {
        for (const row of table.bySex[sex]) {
          for (let i = 0; i < 7; i++) {
            const z = zFromReference(row.z[i], row.z);
            expect(Number.isFinite(z), `${name} ${sex} key=${row.key} z[${i}]`).toBe(true);
            expect(Math.abs(z - Z_LINES[i]), `${name} ${sex} key=${row.key} z[${i}] → ${z}`).toBeLessThan(1e-6);
          }
        }
      }
    });
  }
});

// IMT/U TIDAK monoton naik: median IMT balita turun seiring umur.
// Hanya tabel berat-untuk-umur/tinggi yang naik monoton.
describe('referenceAt monoton naik terhadap key (kecuali IMT)', () => {
  for (const name of TABLE_NAMES) {
    if (String(name).startsWith('imt')) continue;
    const table = TABLES[name] as GrowthTable;
    it(`${String(name)}`, () => {
      for (const sex of ['L', 'P'] as Sex[]) {
        const rows = table.bySex[sex];
        const lo = rows[0].key;
        const hi = rows[rows.length - 1].key;
        for (let k = lo; k <= hi; k += (hi - lo) / 200) {
          const a = referenceAt(table, sex, k);
          const b = referenceAt(table, sex, k + (hi - lo) / 400);
          for (let i = 0; i < 7; i++) {
            expect(a[i]).toBeLessThanOrEqual(b[i] + 1e-9);
          }
        }
      }
    });
  }
});

describe('computeGrowth fuzz: hasil selalu finite & kategori valid', () => {
  it('5000 input acak per jenis kelamin', () => {
    let seed = 1234567;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (const gender of ['L', 'P'] as const) {
      for (let n = 0; n < 5000; n++) {
        const ageMonths = Math.floor(rnd() * 61);
        const weight = Math.round((0.5 + rnd() * 29.5) * 20) / 20;
        const height = Math.round((40 + rnd() * 90) * 10) / 10;
        const position = rnd() < 0.5 ? 'TELENTANG' : 'BERDIRI';
        const birth = new Date(2020, 0, 15);
        const session = new Date(2020 + Math.floor(ageMonths / 12), (ageMonths % 12), 15);
        const res = computeGrowth({ gender, birthDate: birth, sessionDate: session, weight, height, position });
        expect(res.ok).toBe(true);
        for (const idx of ['BB_U', 'TB_U', 'BB_TB', 'IMT_U'] as const) {
          const r = res[idx];
          expect(r).toBeDefined();
          expect(Number.isFinite(r!.z), `z NaN: ${gender} age=${ageMonths} w=${weight} h=${height}`).toBe(true);
          expect(Math.abs(r!.z)).toBeLessThanOrEqual(5 + 1e-9);
          expect(VALID_CATEGORY[idx].has(r!.categoryKey)).toBe(true);
        }
      }
    }
  });
});

describe('classifyZ full domain', () => {
  it('semua z dari -6..6 dapat kategori valid', () => {
    for (const idx of ['BB_U', 'TB_U', 'BB_TB', 'IMT_U'] as const) {
      for (let z = -6; z <= 6; z += 0.01) {
        const c = classifyZ(idx, z);
        expect(c).toBeDefined();
        expect(VALID_CATEGORY[idx].has(c.key)).toBe(true);
      }
    }
  });
});
