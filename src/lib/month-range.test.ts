import { describe, it, expect, afterEach } from 'vitest';
import { monthRange } from '@/lib/analytics';

const originalTZ = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTZ;
});

describe('monthRange tidak bergeser karena timezone', () => {
  it('rentang 12 bulan → tepat 12 bucket di TZ positif, UTC, maupun negatif', () => {
    for (const tz of ['Asia/Jakarta', 'UTC', 'America/New_York']) {
      process.env.TZ = tz;
      const months = monthRange('2025-10-01', '2026-09-30');
      expect(months.length, `TZ=${tz}`).toBe(12);
      expect(months[0], `TZ=${tz}`).toBe('2025-10');
      expect(months[months.length - 1], `TZ=${tz}`).toBe('2026-09');
    }
  });
});
