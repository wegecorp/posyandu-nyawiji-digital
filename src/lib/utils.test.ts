import { describe, it, expect } from 'vitest';
import { calculateAge, getPatientCategory } from './utils';

describe('calculateAge', () => {
  const target = new Date('2026-09-09T12:00:00');

  it('hitung bulan & tahun', () => {
    const age = calculateAge('2025-09-09', target);
    expect(age.years).toBe(1);
    expect(age.totalMonths).toBe(12);
  });

  it('kurangi 1 bulan bila tanggal target belum lewat tanggal lahir', () => {
    const age = calculateAge('2025-09-15', target);
    expect(age.totalMonths).toBe(11);
  });

  it('tampilan untuk bayi < 1 tahun', () => {
    expect(calculateAge('2026-05-09', target).display).toBe('4 Bulan');
  });
});

describe('getPatientCategory', () => {
  const birth = (iso: string) => iso;

  it('BUMIL menang bila isPregnant', () => {
    expect(getPatientCategory(birth('2000-01-01'), true, 'P')).toBe('BUMIL');
  });

  it('kategori berdasarkan usia', () => {
    expect(getPatientCategory(birth('2024-01-01'), false, 'L')).toBe('BALITA'); // 2 th
    expect(getPatientCategory(birth('2019-01-01'), false, 'L')).toBe('ANAK'); // 7 th
    expect(getPatientCategory(birth('2012-01-01'), false, 'L')).toBe('REMAJA'); // 14 th
    expect(getPatientCategory(birth('1990-01-01'), false, 'L')).toBe('DEWASA_LANSIA');
  });
});
