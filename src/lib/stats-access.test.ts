import { describe, it, expect } from 'vitest';
import { canViewPatientDetail } from './stats-access';

describe('canViewPatientDetail', () => {
  it('DINKES hanya agregat — detail pasien ditolak', () => {
    expect(canViewPatientDetail('DINKES')).toBe(false);
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
