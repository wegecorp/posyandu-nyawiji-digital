import { describe, it, expect } from 'vitest';
import { computeWeightProgression, weightStatusShort, isKmsAge } from '@/lib/growth';

describe('computeWeightProgression', () => {
  it('tanpa pembanding → belum dapat dinilai', () => {
    const r = computeWeightProgression(null, 8.2, null, true);
    expect(r.status).toBeNull();
    expect(r.gain).toBeNull();
    expect(r.faltering2T).toBe(false);
  });

  it('berat naik → NAIK', () => {
    const r = computeWeightProgression(8.0, 8.3, null, true);
    expect(r.status).toBe('NAIK');
    expect(r.gain).toBeCloseTo(0.3, 5);
  });

  it('berat sama → TIDAK_NAIK', () => {
    expect(computeWeightProgression(8.0, 8.0, null, true).status).toBe('TIDAK_NAIK');
  });

  it('berat turun → TIDAK_NAIK', () => {
    expect(computeWeightProgression(8.0, 7.8, null, true).status).toBe('TIDAK_NAIK');
  });

  it('2T hanya bila dua kali tidak naik berturut-turut', () => {
    expect(computeWeightProgression(8.0, 8.0, 'TIDAK_NAIK', true).faltering2T).toBe(true);
    expect(computeWeightProgression(8.0, 8.0, 'NAIK', true).faltering2T).toBe(false);
    expect(computeWeightProgression(8.0, 8.0, null, true).faltering2T).toBe(false);
  });

  it('di luar cakupan KMS → semua null (N/T & 2T tak dinilai)', () => {
    const r = computeWeightProgression(8.0, 8.0, 'TIDAK_NAIK', false);
    expect(r.status).toBeNull();
    expect(r.gain).toBeNull();
    expect(r.faltering2T).toBe(false);
  });

  it('berat tidak tersedia → belum dapat dinilai', () => {
    expect(computeWeightProgression(8.0, null, null, true).status).toBeNull();
  });

  it('label singkat', () => {
    expect(weightStatusShort('NAIK')).toBe('N');
    expect(weightStatusShort('TIDAK_NAIK')).toBe('T');
    expect(weightStatusShort(null)).toBe('—');
  });
});

describe('isKmsAge', () => {
  it('hanya umur 0-60 bulan penuh', () => {
    expect(isKmsAge(0)).toBe(true);
    expect(isKmsAge(6)).toBe(true);
    expect(isKmsAge(60)).toBe(true);
    expect(isKmsAge(61)).toBe(false);
    expect(isKmsAge(83)).toBe(false);
    expect(isKmsAge(133)).toBe(false);
    expect(isKmsAge(-1)).toBe(false);
    expect(isKmsAge(null)).toBe(false);
    expect(isKmsAge(undefined)).toBe(false);
  });
});
