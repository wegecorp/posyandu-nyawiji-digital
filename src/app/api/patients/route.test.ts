import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/api-auth';
import { resolvePatientScope } from '@/lib/patient-scope';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findMany: vi.fn(),
    },
    measurement: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-auth', () => ({
  getAuthSession: vi.fn(),
}));

vi.mock('@/lib/patient-scope', () => ({
  resolvePatientScope: vi.fn(),
}));

describe('GET /api/patients - pencarian pasien case-insensitive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('menggunakan mode insensitive dan token multi-kata pada query pencarian', async () => {
    vi.mocked(getAuthSession).mockResolvedValueOnce({
      id: 'u1',
      username: 'kader1',
      name: 'Kader Melati',
      role: 'POSYANDU',
      posyanduId: 'pos-1',
    } as any);

    vi.mocked(resolvePatientScope).mockReturnValueOnce({
      kind: 'posyandu',
      posyanduId: 'pos-1',
    });

    vi.mocked(prisma.patient.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.measurement.findMany).mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/patients?posyanduId=pos-1&q=ahmad%20dhani');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const callArgs = vi.mocked(prisma.patient.findMany).mock.calls[0][0];
    expect(callArgs?.where?.posyanduId).toBe('pos-1');

    // Pastikan AND berisi token 'ahmad' dan 'dhani' dengan mode 'insensitive'
    const andClauses = callArgs?.where?.AND as any[];
    expect(andClauses).toHaveLength(2);

    expect(andClauses[0].OR).toContainEqual({
      name: { contains: 'ahmad', mode: 'insensitive' },
    });
    expect(andClauses[1].OR).toContainEqual({
      name: { contains: 'dhani', mode: 'insensitive' },
    });
  });
});
