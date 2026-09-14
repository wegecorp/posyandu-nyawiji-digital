import { describe, it, expect } from 'vitest';
import { canViewPatientDetail } from './stats-access';

describe('canViewPatientDetail', () => {
  it('DINKES boleh melihat detail pasien', () => {
    expect(canViewPatientDetail('DINKES')).toBe(true);
  });

  it('PUSKESMAS dan POSYANDU boleh', () => {
    expect(canViewPatientDetail('PUSKESMAS')).toBe(true);
    expect(canViewPatientDetail('POSYANDU')).toBe(true);
  });

  it('role kosong/tidak dikenal ditolak', () => {
    expect(canViewPatientDetail(null)).toBe(false);
    expect(canViewPatientDetail(undefined)).toBe(false);
    expect(canViewPatientDetail('')).toBe(false);
  });
});
