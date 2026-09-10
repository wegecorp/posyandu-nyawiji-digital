import { describe, it, expect } from 'vitest';
import { periodToRange } from './PeriodControl';

function countMonths(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm) + 1;
}

describe('periodToRange', () => {
  it('12 bulan → tepat 12 bucket dan mulai dari tanggal 1', () => {
    const { from, to } = periodToRange('12m');
    expect(from.endsWith('-01')).toBe(true);
    expect(to.endsWith('-01')).toBe(false);
    expect(countMonths(from, to)).toBe(12);
  });

  it('6 bulan → tepat 6 bucket', () => {
    const { from, to } = periodToRange('6m');
    expect(countMonths(from, to)).toBe(6);
  });

  it('24 bulan → tepat 24 bucket', () => {
    const { from, to } = periodToRange('24m');
    expect(countMonths(from, to)).toBe(24);
  });

  it('nilai custom (from|to) diteruskan apa adanya', () => {
    expect(periodToRange('2026-01-01|2026-01-31')).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
    });
  });
});
