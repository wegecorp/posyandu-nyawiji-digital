import { describe, it, expect } from 'vitest';
import {
  ageInCompletedMonths,
  computeGrowth,
  correctedLengthHeight,
  classifyZ,
  referenceAt,
  zFromReference,
  TABLES,
} from '@/lib/growth';

describe('ageInCompletedMonths', () => {
  it('bulan penuh: 2 bulan 29 hari dihitung 2 bulan', () => {
    expect(ageInCompletedMonths('2020-01-01', '2020-03-30')).toBe(2);
  });
  it('tepat setahun = 12 bulan', () => {
    expect(ageInCompletedMonths('2020-01-15', '2021-01-15')).toBe(12);
  });
  it('hari belum genap mengurangi satu bulan', () => {
    expect(ageInCompletedMonths('2020-01-20', '2021-01-15')).toBe(11);
  });
});

describe('koreksi panjang/tinggi badan (Permenkes ±0,7 cm)', () => {
  it('<24 bulan diukur berdiri → +0,7', () => {
    expect(correctedLengthHeight(12, 'BERDIRI', 75.0)).toBeCloseTo(75.7, 5);
  });
  it('<24 bulan telentang → tidak diubah', () => {
    expect(correctedLengthHeight(12, 'TELENTANG', 75.0)).toBeCloseTo(75.0, 5);
  });
  it('≥24 bulan telentang → −0,7', () => {
    expect(correctedLengthHeight(30, 'TELENTANG', 90.0)).toBeCloseTo(89.3, 5);
  });
  it('≥24 bulan berdiri → tidak diubah', () => {
    expect(correctedLengthHeight(30, 'BERDIRI', 90.0)).toBeCloseTo(90.0, 5);
  });
});

describe('zFromReference (piecewise 7 garis SD)', () => {
  const ref = [6.9, 7.7, 8.6, 9.6, 10.8, 12.0, 13.3]; // BB/U L 12 bln
  it('tepat di median → 0', () => {
    expect(zFromReference(9.6, ref)).toBeCloseTo(0, 5);
  });
  it('tepat di -1 SD → -1', () => {
    expect(zFromReference(8.6, ref)).toBeCloseTo(-1, 5);
  });
  it('8,0 kg → -1,67 (bukan -1,6 metode simplifikasi)', () => {
    expect(zFromReference(8.0, ref)).toBeCloseTo(-1.6667, 3);
  });
  it('di bawah -3 SD terekspolarasi < -3', () => {
    expect(zFromReference(6.0, ref)).toBeLessThan(-3);
  });
  it('di atas +3 SD terekspolarasi > 3', () => {
    expect(zFromReference(15.0, ref)).toBeGreaterThan(3);
  });
});

describe('classifyZ batas kategori Permenkes 2/2020', () => {
  it('BB/U', () => {
    expect(classifyZ('BB_U', -3.01).key).toBe('severely_underweight');
    expect(classifyZ('BB_U', -3).key).toBe('underweight');
    expect(classifyZ('BB_U', -2).key).toBe('normal');
    expect(classifyZ('BB_U', 1).key).toBe('normal');
    expect(classifyZ('BB_U', 1.01).key).toBe('risk_overweight');
  });
  it('TB/U', () => {
    expect(classifyZ('TB_U', -3.01).key).toBe('severely_stunted');
    expect(classifyZ('TB_U', -2).key).toBe('normal');
    expect(classifyZ('TB_U', 3).key).toBe('normal');
    expect(classifyZ('TB_U', 3.01).key).toBe('tall');
  });
  it('BB/TB & IMT/U 6 kategori', () => {
    expect(classifyZ('BB_TB', -3.01).key).toBe('severely_wasted');
    expect(classifyZ('BB_TB', -2).key).toBe('normal');
    expect(classifyZ('BB_TB', 1).key).toBe('normal');
    expect(classifyZ('BB_TB', 1.01).key).toBe('risk_overweight');
    expect(classifyZ('BB_TB', 2).key).toBe('risk_overweight');
    expect(classifyZ('BB_TB', 2.01).key).toBe('overweight');
    expect(classifyZ('BB_TB', 3).key).toBe('overweight');
    expect(classifyZ('BB_TB', 3.01).key).toBe('obese');
    expect(classifyZ('IMT_U', 3.01).key).toBe('obese');
  });
});

describe('computeGrowth', () => {
  it('contoh soal: L, 12 bln, BB 8,0 kg → Z BB/U -1,67 (normal)', () => {
    const res = computeGrowth({
      gender: 'L',
      birthDate: '2020-01-15',
      sessionDate: '2021-01-15',
      weight: 8.0,
      height: null,
    });
    expect(res.ok).toBe(true);
    expect(res.BB_U?.z).toBeCloseTo(-1.67, 2);
    expect(res.BB_U?.categoryKey).toBe('normal');
  });

  it('menghitung keempat indeks saat BB & TB lengkap', () => {
    const res = computeGrowth({
      gender: 'L',
      birthDate: '2020-01-15',
      sessionDate: '2021-01-15',
      weight: 8.0,
      height: 75.7,
      position: 'TELENTANG',
    });
    expect(res.BB_U).toBeDefined();
    expect(res.TB_U).toBeDefined();
    expect(res.BB_TB).toBeDefined();
    expect(res.IMT_U).toBeDefined();
    expect(res.IMT_U?.categoryKey).toBe('wasted');
  });

  it('koreksi posisi diterapkan sebelum Z', () => {
    const lying = computeGrowth({
      gender: 'P',
      birthDate: '2019-01-15',
      sessionDate: '2021-07-15', // 30 bulan
      weight: 12,
      height: 90.0,
      position: 'TELENTANG',
    });
    expect(lying.correctedStature).toBeCloseTo(89.3, 5);
  });

  it('gender kosong → ok:false, reason gender', () => {
    const res = computeGrowth({ gender: null, birthDate: '2020-01-15', sessionDate: '2021-01-15', weight: 8 });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('gender');
  });

  it('umur >60 bulan → ok:false, reason age', () => {
    const res = computeGrowth({ gender: 'L', birthDate: '2010-01-15', sessionDate: '2021-01-15', weight: 20 });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('age');
  });

  it('tanpa BB & TB → ok:false, reason no-data', () => {
    const res = computeGrowth({ gender: 'L', birthDate: '2020-01-15', sessionDate: '2021-01-15' });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('no-data');
  });

  it('TB/U sangat pendek terdeteksi', () => {
    const res = computeGrowth({
      gender: 'L',
      birthDate: '2020-01-15',
      sessionDate: '2022-01-15', // 24 bulan
      height: 74.0,
      position: 'BERDIRI',
    });
    expect(res.TB_U?.categoryKey).toBe('severely_stunted');
  });
});

describe('tabel referensi terekstrak benar', () => {
  it('BB/U L 12 bln sesuai Lampiran', () => {
    const ref = referenceAt(TABLES['bb-u'], 'L', 12);
    expect(ref).toEqual([6.9, 7.7, 8.6, 9.6, 10.8, 12.0, 13.3]);
  });
  it('interpolasi BB/TB pada cm pecahan', () => {
    const ref = referenceAt(TABLES['bb-tb'], 'L', 65.25);
    // Antara 65.0 [5.9..9.6] dan 65.5 [6.0..9.8]
    expect(ref[0]).toBeCloseTo(5.95, 5);
    expect(ref[6]).toBeCloseTo(9.7, 5);
  });
  it('jumlah baris tiap tabel lengkap', () => {
    expect(TABLES['bb-u'].bySex.L.length).toBe(61);
    expect(TABLES['bb-pb'].bySex.P.length).toBe(131);
    expect(TABLES['bb-tb'].bySex.P.length).toBe(111);
    expect(TABLES['imt-u-24-60'].bySex.L.length).toBe(37);
  });
});
