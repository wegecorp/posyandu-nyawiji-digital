import { describe, it, expect } from 'vitest';
import { getUnitAvatarDataUri } from './unit-avatar';

describe('unit-avatar offline generator', () => {
  it('generates offline data uri for landscape (Posyandu)', () => {
    const uri = getUnitAvatarDataUri('landscape', 'Melati 1');
    expect(uri).toContain('data:image/svg+xml');
  });

  it('generates offline data uri for planets (Puskesmas)', () => {
    const uri = getUnitAvatarDataUri('planets', 'Puskesmas Wonosari I');
    expect(uri).toContain('data:image/svg+xml');
  });

  it('generates offline data uri for waves (Kalurahan)', () => {
    const uri = getUnitAvatarDataUri('waves', 'Wunung');
    expect(uri).toContain('data:image/svg+xml');
  });

  it('generates offline data uri for squircles (Dinkes)', () => {
    const uri = getUnitAvatarDataUri('squircles', 'Dinas Kesehatan');
    expect(uri).toContain('data:image/svg+xml');
  });

  it('returns cached data uri for identical queries', () => {
    const uri1 = getUnitAvatarDataUri('landscape', 'Melati 1');
    const uri2 = getUnitAvatarDataUri('landscape', 'Melati 1');
    expect(uri1).toBe(uri2);
  });
});
