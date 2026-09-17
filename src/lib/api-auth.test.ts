import { describe, it, expect } from 'vitest';
import { assertHcFilter, requireSessionScope } from './api-auth';
import type { SessionPayload } from './session';

function session(role: SessionPayload['role'], healthCenterId: string | null = null): SessionPayload {
  return { userId: 'u1', username: 'x', name: 'X', role, healthCenterId };
}

describe('assertHcFilter', () => {
  it('tanpa hcId selalu lolos', () => {
    expect(assertHcFilter(session('DINKES'), null)).toBeNull();
    expect(assertHcFilter(session('POSYANDU'), null)).toBeNull();
  });

  it('DINKES boleh drill HC mana pun', () => {
    expect(assertHcFilter(session('DINKES', null), 'hc-1')).toBeNull();
  });

  it('PUSKESMAS hanya HC sendiri', () => {
    expect(assertHcFilter(session('PUSKESMAS', 'hc-1'), 'hc-1')).toBeNull();
    expect(assertHcFilter(session('PUSKESMAS', 'hc-1'), 'hc-2')?.status).toBe(403);
  });

  it('POSYANDU ditolak walau HC sama', () => {
    expect(assertHcFilter(session('POSYANDU', 'hc-1'), 'hc-1')?.status).toBe(403);
  });
});

describe('requireSessionScope (fail-closed)', () => {
  it('POSYANDU tanpa posyanduId ditolak 403', () => {
    expect(requireSessionScope(session('POSYANDU'))?.status).toBe(403);
  });

  it('POSYANDU dengan posyanduId lolos', () => {
    expect(requireSessionScope({ ...session('POSYANDU'), posyanduId: 'p1' })).toBeNull();
  });

  it('PUSKESMAS tanpa healthCenterId ditolak 403', () => {
    expect(requireSessionScope(session('PUSKESMAS'))?.status).toBe(403);
  });

  it('PUSKESMAS dengan healthCenterId lolos', () => {
    expect(requireSessionScope(session('PUSKESMAS', 'hc-1'))).toBeNull();
  });

  it('DINKES tanpa id lokasi lolos', () => {
    expect(requireSessionScope(session('DINKES'))).toBeNull();
  });
});
