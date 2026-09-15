import { describe, it, expect } from 'vitest';
import {
  validateMeasurementValue,
  validateBloodPressure,
  computeImt,
  validateBirthDate,
  validatePhone,
  validateTextLength,
  isMeasurementComplete,
  measurementCompletion,
} from './validation';

describe('validateMeasurementValue', () => {
  it('kosong valid (nilai tidak wajib)', () => {
    expect(validateMeasurementValue('weight', '')).toEqual({ valid: true, message: null });
    expect(validateMeasurementValue('weight', null)).toEqual({ valid: true, message: null });
  });

  it('menolak nilai non-angka', () => {
    const r = validateMeasurementValue('weight', 'abc');
    expect(r.valid).toBe(false);
  });

  it('menolak nilai di luar batas wajar', () => {
    expect(validateMeasurementValue('weight', '0.1').valid).toBe(false);
    expect(validateMeasurementValue('weight', '500').valid).toBe(false);
    expect(validateMeasurementValue('weight', '12.5').valid).toBe(true);
  });
});

describe('validateBloodPressure', () => {
  it('sistolik harus > diastolik', () => {
    expect(validateBloodPressure('110', '120').valid).toBe(false);
    expect(validateBloodPressure('120', '80').valid).toBe(true);
  });

  it('pasangan kosong valid', () => {
    expect(validateBloodPressure('', '').valid).toBe(true);
  });
});

describe('computeImt', () => {
  it('hitung IMT dari BB/TB', () => {
    expect(computeImt('60', '165')).toBeCloseTo(22.0, 1);
  });

  it('return null bila input tidak valid', () => {
    expect(computeImt('', '165')).toBeNull();
    expect(computeImt('60', '0')).toBeNull();
  });
});

describe('validateBirthDate', () => {
  it('menolak tanggal kosong/invalid', () => {
    expect(validateBirthDate('').valid).toBe(false);
    expect(validateBirthDate('not-a-date').valid).toBe(false);
  });

  it('menolak tanggal masa depan', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(validateBirthDate(future.toISOString().slice(0, 10)).valid).toBe(false);
  });

  it('menerima tanggal lahir wajar', () => {
    expect(validateBirthDate('2020-01-01').valid).toBe(true);
  });
});

describe('validatePhone', () => {
  it('kosong valid', () => {
    expect(validatePhone('').valid).toBe(true);
  });

  it('menolak digit di luar 8–15', () => {
    expect(validatePhone('0812').valid).toBe(false);
    expect(validatePhone('081234567890123456').valid).toBe(false);
    expect(validatePhone('081234567890').valid).toBe(true);
  });
});

describe('validateTextLength', () => {
  it('menolak melebihi batas', () => {
    expect(validateTextLength('x'.repeat(121), 'Nama', 120).valid).toBe(false);
    expect(validateTextLength('ok', 'Nama', 120).valid).toBe(true);
  });
});

describe('isMeasurementComplete', () => {
  it('lengkap hanya bila BB & TB terisi', () => {
    expect(isMeasurementComplete(null)).toBe(false);
    expect(isMeasurementComplete({ weight: 10, height: null })).toBe(false);
    expect(isMeasurementComplete({ weight: 10, height: 80 })).toBe(true);
  });
});

describe('measurementCompletion', () => {
  it('0% saat belum ada data', () => {
    expect(measurementCompletion(null, 'BALITA')).toEqual({ filled: 0, total: 2, percent: 0 });
  });

  it('50% saat baru 1 dari 2 field terisi', () => {
    expect(measurementCompletion({ weight: 10 }, 'BALITA').percent).toBe(50);
  });

  it('100% saat semua field terisi', () => {
    expect(measurementCompletion({ weight: 10, height: 80 }, 'BALITA').percent).toBe(100);
  });

  it('string kosong dihitung belum terisi', () => {
    expect(measurementCompletion({ weight: '', height: 80 }, 'BALITA').percent).toBe(50);
  });
});
