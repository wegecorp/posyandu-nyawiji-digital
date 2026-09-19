import { describe, it, expect } from 'vitest';
import { classifyOutcomes, dateRangeMs, aggregateToKabupaten } from '@/lib/analytics';

function row(over: Record<string, unknown> = {}) {
  return {
    ym: '2026-01',
    posyanduId: 'pos1',
    patientId: 'p1',
    sessionDate: new Date('2026-01-15T08:00:00'),
    category: 'BALITA_APRAS',
    gender: 'L',
    systolic: null,
    diastolic: null,
    hemoglobin: null,
    bloodSugar: null,
    cholesterol: null,
    uricAcid: null,
    visionStatus: null,
    hearingStatus: null,
    tbScreeningStatus: null,
    ...over,
  } as Parameters<typeof classifyOutcomes>[0][number];
}

describe('dateRangeMs', () => {
  it('menghasilkan epoch ms yang tepat dalam zona waktu WIB (+07:00)', () => {
    const { fromMs, toMs } = dateRangeMs('2025-08-01', '2025-08-31');
    // 2025-08-01 00:00 WIB = 2025-07-31 17:00 UTC
    expect(new Date(fromMs).toISOString()).toBe('2025-07-31T17:00:00.000Z');
    // 2025-08-31 + 1 day = 2025-09-01 00:00 WIB = 2025-08-31 17:00 UTC
    expect(new Date(toMs).toISOString()).toBe('2025-08-31T17:00:00.000Z');
  });
});

describe('aggregateToKabupaten', () => {
  it('mengagregasi numerator dan denominator dan menghitung partisipasi', () => {
    const base = [
      { ym: '2025-08', unitId: 'pos1', numerator: 5, denominator: 10 },
      { ym: '2025-08', unitId: 'pos2', numerator: 5, denominator: 10 },
    ];
    const res = aggregateToKabupaten(base, ['2025-08']);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      ym: '2025-08',
      numerator: 10,
      denominator: 20,
      participation: 0.5,
    });
  });
});

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
      row({ category: 'DEWASA', systolic: 160, diastolic: 100 }),
    ]);
    expect(totals[0].abnormal).toBe(1);
    expect(totals[0].abnormalByIndicator.hypertension).toBe(1);
  });

  it('indikator di luar berlaku tidak dihitung (appliesTo): gula darah balita', () => {
    const { totals } = classifyOutcomes([row({ bloodSugar: 200 })]);
    expect(totals[0].abnormal).toBe(0);
    expect(totals[0].notAssessed).toBe(1);
  });

  it('skrining TB beresiko → Tidak Normal', () => {
    const { totals } = classifyOutcomes([row({ tbScreeningStatus: 'BERESIKO' })]);
    expect(totals[0].abnormal).toBe(1);
    expect(totals[0].abnormalByIndicator.tbRisk).toBe(1);
  });

  it('skrining TB tidak beresiko → Normal', () => {
    const { totals } = classifyOutcomes([row({ tbScreeningStatus: 'TIDAK_BERESIKO' })]);
    expect(totals[0].abnormal).toBe(0);
    expect(totals[0].normal).toBe(1);
  });

  it('eligibleByIndicator menghitung pasien yang indikatornya berlaku (dasar Belum Dinilai)', () => {
    const { totals } = classifyOutcomes([row()]);
    // tbRisk berlaku untuk balita → eligible 1, tanpa nilai → belum dinilai.
    expect(totals[0].eligibleByIndicator.tbRisk).toBe(1);
    expect(totals[0].assessedByIndicator.tbRisk).toBeUndefined();
    // gula darah tidak berlaku untuk balita → tidak masuk eligible.
    expect(totals[0].eligibleByIndicator.bloodSugar).toBeUndefined();
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
