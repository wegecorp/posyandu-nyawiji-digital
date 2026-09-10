import { describe, it, expect } from 'vitest';
import { classifyOutcomes } from '@/lib/analytics';

function row(over: Record<string, unknown> = {}) {
  return {
    ym: '2026-01',
    posyanduId: 'pos1',
    patientId: 'p1',
    sessionDate: new Date('2026-01-15T08:00:00'),
    category: 'BALITA',
    gender: 'L',
    systolic: null,
    diastolic: null,
    hemoglobin: null,
    bloodSugar: null,
    cholesterol: null,
    uricAcid: null,
    visionStatus: null,
    hearingStatus: null,
    ...over,
  } as Parameters<typeof classifyOutcomes>[0][number];
}

describe('classifyOutcomes', () => {
  it('balita tanpa indikator klinis → Belum Dinilai (bukan Normal)', () => {
    const { totals } = classifyOutcomes([row()]);
    expect(totals).toHaveLength(1);
    expect(totals[0].notAssessed).toBe(1);
    expect(totals[0].normal).toBe(0);
    expect(totals[0].abnormal).toBe(0);
    expect(totals[0].total).toBe(1);
  });

  it('dewasa dengan tensi tinggi → Tidak Normal', () => {
    const { totals } = classifyOutcomes([
      row({ category: 'DEWASA_LANSIA', systolic: 160, diastolic: 100 }),
    ]);
    expect(totals[0].abnormal).toBe(1);
    expect(totals[0].abnormalByIndicator.hypertension).toBe(1);
  });

  it('indikator di luar berlaku tidak dihitung (appliesTo): gula darah balita', () => {
    const { totals } = classifyOutcomes([row({ bloodSugar: 200 })]);
    expect(totals[0].abnormal).toBe(0);
    expect(totals[0].notAssessed).toBe(1);
  });

  it('dedupe per pasien per bulan (ambil pengukuran terakhir)', () => {
    const { totals } = classifyOutcomes([
      row({ sessionDate: new Date('2026-01-05T08:00:00'), hemoglobin: 8 }),
      row({ sessionDate: new Date('2026-01-25T08:00:00'), hemoglobin: 13 }),
    ]);
    expect(totals[0].total).toBe(1);
    expect(totals[0].abnormal).toBe(0);
    expect(totals[0].normal).toBe(1);
  });
});
