import { describe, it, expect } from 'vitest';
import { resolvePatientScope, resolveReportPosyanduIds } from './patient-scope';

describe('resolvePatientScope (fail-closed)', () => {
  it('POSYANDU tanpa posyanduId DITOLAK (bukan all)', () => {
    expect(resolvePatientScope({ role: 'POSYANDU', posyanduId: null })).toEqual({ kind: 'deny' });
    expect(resolvePatientScope({ role: 'POSYANDU' })).toEqual({ kind: 'deny' });
  });

  it('POSYANDU dengan posyanduId dibatasi ke posyandu itu', () => {
    expect(resolvePatientScope({ role: 'POSYANDU', posyanduId: 'p1' })).toEqual({
      kind: 'posyandu',
      posyanduId: 'p1',
    });
  });

  it('PUSKESMAS tanpa healthCenterId DITOLAK (bukan all)', () => {
    expect(resolvePatientScope({ role: 'PUSKESMAS', healthCenterId: null })).toEqual({ kind: 'deny' });
    expect(resolvePatientScope({ role: 'PUSKESMAS' })).toEqual({ kind: 'deny' });
  });

  it('PUSKESMAS dengan healthCenterId dibatasi ke wilayahnya', () => {
    expect(resolvePatientScope({ role: 'PUSKESMAS', healthCenterId: 'hc1' })).toEqual({
      kind: 'healthCenter',
      healthCenterId: 'hc1',
    });
  });

  it('PUSKESMAS menyebut posyanduId → target posyandu (untuk diverifikasi pemilik)', () => {
    expect(resolvePatientScope({ role: 'PUSKESMAS', healthCenterId: 'hc1' }, 'p9')).toEqual({
      kind: 'posyandu',
      posyanduId: 'p9',
    });
  });

  it('DINKES tanpa posyanduId boleh seluruh wilayah', () => {
    expect(resolvePatientScope({ role: 'DINKES' })).toEqual({ kind: 'all' });
  });

  it('DINKES dengan posyanduId dibatasi ke posyandu itu', () => {
    expect(resolvePatientScope({ role: 'DINKES' }, 'p2')).toEqual({ kind: 'posyandu', posyanduId: 'p2' });
  });

  it('role tak dikenal DITOLAK', () => {
    expect(resolvePatientScope({ role: '' })).toEqual({ kind: 'deny' });
    expect(resolvePatientScope({ role: 'HACKER' })).toEqual({ kind: 'deny' });
  });
});

describe('resolveReportPosyanduIds (export/rekap, fail-closed)', () => {
  it('POSYANDU tanpa posyanduId DITOLAK (bukan semua unit)', () => {
    expect(resolveReportPosyanduIds({ role: 'POSYANDU', posyanduId: null }, ['a', 'b'])).toEqual({
      ok: false,
    });
    expect(resolveReportPosyanduIds({ role: 'POSYANDU' }, ['a', 'b'])).toEqual({ ok: false });
  });

  it('POSYANDU dengan posyanduId dibatasi ke unit itu', () => {
    expect(resolveReportPosyanduIds({ role: 'POSYANDU', posyanduId: 'p1' }, [])).toEqual({
      ok: true,
      ids: ['p1'],
    });
  });

  it('PUSKESMAS tanpa healthCenterId DITOLAK (bukan semua unit)', () => {
    expect(resolveReportPosyanduIds({ role: 'PUSKESMAS', healthCenterId: null }, ['a'])).toEqual({
      ok: false,
    });
    expect(resolveReportPosyanduIds({ role: 'PUSKESMAS' }, ['a'])).toEqual({ ok: false });
  });

  it('PUSKESMAS tanpa pilihan → semua binaan', () => {
    expect(resolveReportPosyanduIds({ role: 'PUSKESMAS', healthCenterId: 'hc1' }, ['a', 'b'])).toEqual({
      ok: true,
      ids: ['a', 'b'],
    });
  });

  it('PUSKESMAS pilih posyandu asing → tersaring diam-diam', () => {
    expect(
      resolveReportPosyanduIds({ role: 'PUSKESMAS', healthCenterId: 'hc1' }, ['a', 'b'], ['a', 'x']),
    ).toEqual({ ok: true, ids: ['a'] });
  });

  it('DINKES mendapat seluruh unit', () => {
    expect(resolveReportPosyanduIds({ role: 'DINKES' }, ['a', 'b', 'c'])).toEqual({
      ok: true,
      ids: ['a', 'b', 'c'],
    });
  });

  it('role tak dikenal DITOLAK', () => {
    expect(resolveReportPosyanduIds({ role: 'HACKER' }, ['a'])).toEqual({ ok: false });
    expect(resolveReportPosyanduIds({ role: '' }, ['a'])).toEqual({ ok: false });
  });
});
