import { describe, it, expect } from 'vitest';
import { FIELD_APPLIES_TO, fieldAppliesTo } from '@/lib/measurement-fields';
import { INDICATORS } from '@/lib/clinical';

const indicator = (key: (typeof INDICATORS)[number]['key']) =>
  INDICATORS.find((i) => i.key === key)!;

describe('fieldAppliesTo (kolom input sesuai sasaran)', () => {
  it('bayi: tanpa kolesterol/GDS/asam urat/lingkar perut, tetap ada HB & TB', () => {
    expect(fieldAppliesTo('cholesterol', 'BAYI')).toBe(false);
    expect(fieldAppliesTo('bloodSugar', 'BAYI')).toBe(false);
    expect(fieldAppliesTo('uricAcid', 'BAYI')).toBe(false);
    expect(fieldAppliesTo('waistCircumference', 'BAYI')).toBe(false);
    expect(fieldAppliesTo('armCircumference', 'BAYI')).toBe(false);
    expect(fieldAppliesTo('hemoglobin', 'BAYI')).toBe(true);
    expect(fieldAppliesTo('tbScreeningStatus', 'BAYI')).toBe(true);
    expect(fieldAppliesTo('weight', 'BAYI')).toBe(true);
  });

  it('balita: LK/posisi/LiLA ada, lab PTM tidak (kecuali HB)', () => {
    expect(fieldAppliesTo('headCircumference', 'BALITA_APRAS')).toBe(true);
    expect(fieldAppliesTo('position', 'BALITA_APRAS')).toBe(true);
    expect(fieldAppliesTo('armCircumference', 'BALITA_APRAS')).toBe(true);
    expect(fieldAppliesTo('cholesterol', 'BALITA_APRAS')).toBe(false);
    expect(fieldAppliesTo('hemoglobin', 'BALITA_APRAS')).toBe(true);
  });

  it('remaja: tensi & lab PTM berlaku, lingkar perut tidak', () => {
    expect(fieldAppliesTo('systolic', 'REMAJA')).toBe(true);
    expect(fieldAppliesTo('bloodSugar', 'REMAJA')).toBe(true);
    expect(fieldAppliesTo('cholesterol', 'REMAJA')).toBe(true);
    expect(fieldAppliesTo('waistCircumference', 'REMAJA')).toBe(false);
  });

  it('dewasa & lansia: lingkar perut + seluruh lab PTM', () => {
    for (const c of ['DEWASA', 'LANSIA'] as const) {
      expect(fieldAppliesTo('waistCircumference', c)).toBe(true);
      expect(fieldAppliesTo('cholesterol', c)).toBe(true);
      expect(fieldAppliesTo('uricAcid', c)).toBe(true);
    }
  });

  it('bumil: usia kehamilan, tensi, LiLA; tanpa lingkar perut/kolesterol', () => {
    expect(fieldAppliesTo('gestationalAge', 'BUMIL')).toBe(true);
    expect(fieldAppliesTo('systolic', 'BUMIL')).toBe(true);
    expect(fieldAppliesTo('armCircumference', 'BUMIL')).toBe(true);
    expect(fieldAppliesTo('waistCircumference', 'BUMIL')).toBe(false);
    expect(fieldAppliesTo('cholesterol', 'BUMIL')).toBe(false);
    expect(fieldAppliesTo('exclusiveBreastfeeding', 'BUMIL')).toBe(false);
  });

  it('ASI eksklusif hanya untuk bayi', () => {
    expect(fieldAppliesTo('exclusiveBreastfeeding', 'BAYI')).toBe(true);
    expect(fieldAppliesTo('exclusiveBreastfeeding', 'BALITA_APRAS')).toBe(false);
  });
});

describe('anti-drift: field klinis = INDICATORS.appliesTo', () => {
  it('semua field klinis mengikuti kebijakan clinical.ts', () => {
    expect(FIELD_APPLIES_TO.systolic).toEqual(indicator('hypertension').appliesTo);
    expect(FIELD_APPLIES_TO.diastolic).toEqual(indicator('hypertension').appliesTo);
    expect(FIELD_APPLIES_TO.hemoglobin).toEqual(indicator('anemia').appliesTo);
    expect(FIELD_APPLIES_TO.bloodSugar).toEqual(indicator('highBloodSugar').appliesTo);
    expect(FIELD_APPLIES_TO.cholesterol).toEqual(indicator('highCholesterol').appliesTo);
    expect(FIELD_APPLIES_TO.uricAcid).toEqual(indicator('highUricAcid').appliesTo);
    expect(FIELD_APPLIES_TO.visionStatus).toEqual(indicator('abnormalVision').appliesTo);
    expect(FIELD_APPLIES_TO.hearingStatus).toEqual(indicator('abnormalHearing').appliesTo);
    expect(FIELD_APPLIES_TO.tbScreeningStatus).toEqual(indicator('tbRisk').appliesTo);
  });
});
