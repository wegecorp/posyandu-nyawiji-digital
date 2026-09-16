import { describe, it, expect } from 'vitest';
import { computeWeightProgression, weightStatusShort, supportsWeightFaltering } from '@/lib/growth';

describe('computeWeightProgression', () => {
  it('tanpa pembanding → belum dapat dinilai', () => {
    const r = computeWeightProgression(null, 8.2);
    expect(r.status).toBeNull();
    expect(r.gain).toBeNull();
    expect(r.faltering2T).toBe(false);
  });

  it('berat naik → NAIK', () => {
    const r = computeWeightProgression(8.0, 8.3);
    expect(r.status).toBe('NAIK');
    expect(r.gain).toBeCloseTo(0.3, 5);
  });

  it('berat sama → TIDAK_NAIK', () => {
    expect(computeWeightProgression(8.0, 8.0).status).toBe('TIDAK_NAIK');
  });

  it('berat turun → TIDAK_NAIK', () => {
    expect(computeWeightProgression(8.0, 7.8).status).toBe('TIDAK_NAIK');
  });

  it('2T hanya bila dua kali tidak naik berturut-turut', () => {
    expect(computeWeightProgression(8.0, 8.0, 'TIDAK_NAIK').faltering2T).toBe(true);
    expect(computeWeightProgression(8.0, 8.0, 'NAIK').faltering2T).toBe(false);
    expect(computeWeightProgression(8.0, 8.0, null).faltering2T).toBe(false);
  });

  it('2T ditekan bila kategori tidak eligible (non-Bayi/Balita)', () => {
    expect(computeWeightProgression(8.0, 8.0, 'TIDAK_NAIK', false).faltering2T).toBe(false);
    expect(computeWeightProgression(8.0, 8.0, 'TIDAK_NAIK', true).faltering2T).toBe(true);
  });

  it('supportsWeightFaltering hanya Bayi & Balita/Apras', () => {
    expect(supportsWeightFaltering('BAYI')).toBe(true);
    expect(supportsWeightFaltering('BALITA_APRAS')).toBe(true);
    expect(supportsWeightFaltering('REMAJA')).toBe(false);
    expect(supportsWeightFaltering('DEWASA')).toBe(false);
    expect(supportsWeightFaltering('LANSIA')).toBe(false);
    expect(supportsWeightFaltering('BUMIL')).toBe(false);
    expect(supportsWeightFaltering(null)).toBe(false);
  });

  it('berat tidak tersedia → belum dapat dinilai', () => {
    expect(computeWeightProgression(8.0, null).status).toBeNull();
  });

  it('label singkat', () => {
    expect(weightStatusShort('NAIK')).toBe('N');
    expect(weightStatusShort('TIDAK_NAIK')).toBe('T');
    expect(weightStatusShort(null)).toBe('—');
  });
});
