import { describe, it, expect } from 'vitest';
import {
  latestPerPatient,
  statusCounts,
  registeredBalitaIds,
  problemRate,
  type GrowthMeasureRow,
} from '@/lib/growth-analytics';

function row(over: Partial<GrowthMeasureRow> = {}): GrowthMeasureRow {
  return {
    patientId: 'p1',
    posyanduId: 'pos1',
    sessionDate: new Date('2021-01-15'),
    weight: 8,
    height: 75.7,
    position: 'TELENTANG',
    gender: 'L',
    birthDate: new Date('2020-01-15'),
    ...over,
  };
}

describe('latestPerPatient', () => {
  it('mengambil pengukuran terbaru per anak', () => {
    const rows = [
      row({ patientId: 'a', sessionDate: new Date('2021-01-15') }),
      row({ patientId: 'a', sessionDate: new Date('2021-03-15') }),
      row({ patientId: 'b', sessionDate: new Date('2021-02-15') }),
    ];
    const latest = latestPerPatient(rows);
    expect(latest).toHaveLength(2);
    expect(latest.find((r) => r.patientId === 'a')?.sessionDate).toEqual(new Date('2021-03-15'));
  });
});

describe('statusCounts', () => {
  it('anak 12 bln BB 8 kg → BB/U normal', () => {
    const { total, categories } = statusCounts([row()], 'BB_U');
    expect(total).toBe(1);
    const normal = categories.find((c) => c.key === 'normal');
    expect(normal?.count).toBe(1);
    expect(normal?.percent).toBeCloseTo(100, 5);
  });

  it('menggabungkan kategori risiko ke normal untuk cakupan', () => {
    // BB/U dengan z > +1 harus masuk normal pada agregasi program.
    const heavy = row({ weight: 13 }); // 12 bln L: +2 SD = 12.0, +3 = 13.3
    const { categories } = statusCounts([heavy], 'BB_U');
    expect(categories.some((c) => c.key === 'risk_overweight')).toBe(false);
    expect(categories.reduce((a, c) => a + c.count, 0)).toBe(1);
    expect(categories.find((c) => c.key === 'normal')?.count).toBe(1);
  });

  it('tanpa hasil (gender kosong) → total 0', () => {
    const { total } = statusCounts([row({ gender: null })], 'BB_U');
    expect(total).toBe(0);
  });
});

describe('registeredBalitaIds', () => {
  const asOf = new Date('2024-01-15');
  it('hanya umur 0-60 bulan', () => {
    const ids = registeredBalitaIds(
      [
        { id: 'bayi', posyanduId: 'x', gender: 'L', birthDate: new Date('2023-06-15') },
        { id: 'balita', posyanduId: 'x', gender: 'L', birthDate: new Date('2020-01-15') },
        { id: 'anak', posyanduId: 'x', gender: 'L', birthDate: new Date('2016-01-15') },
      ],
      asOf,
    );
    expect(ids.has('bayi')).toBe(true);
    expect(ids.has('balita')).toBe(true);
    expect(ids.has('anak')).toBe(false);
  });
});

describe('problemRate', () => {
  it('persen kategori selain normal', () => {
    const rate = problemRate([
      { key: 'normal', label: 'n', color: '#0', count: 8, percent: 80 },
      { key: 'wasted', label: 'w', color: '#0', count: 2, percent: 20 },
    ]);
    expect(rate).toBeCloseTo(20, 5);
  });
});
