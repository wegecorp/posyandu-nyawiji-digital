import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, DELETE } from './route';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/api-auth';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    posyandu: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    patient: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-auth', () => ({
  getAuthSession: vi.fn(),
}));

describe('API /api/dev-audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/dev-audit mendeteksi user-agent dan status session', async () => {
    vi.mocked(getAuthSession).mockResolvedValueOnce({
      userId: 'u1',
      username: 'kader1',
      name: 'Kader Test',
      role: 'POSYANDU',
      posyanduId: 'pos-1',
    } as any);

    const req = new Request('http://localhost/api/dev-audit', {
      headers: {
        'user-agent': 'Mozilla/5.0 ... GSA/15.0 Mobile',
        cookie: 'posyandu_session=xyz',
      },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.diagnostics.isGSA).toBe(true);
    expect(json.diagnostics.session.role).toBe('POSYANDU');
  });

  it('POST /api/dev-audit (Dry-Run) memvalidasi data tanpa menyimpan ke DB', async () => {
    vi.mocked(getAuthSession).mockResolvedValueOnce({
      userId: 'u1',
      username: 'kader1',
      name: 'Kader Test',
      role: 'POSYANDU',
      posyanduId: 'pos-1',
    } as any);

    vi.mocked(prisma.posyandu.findUnique).mockResolvedValueOnce({
      id: 'pos-1',
      name: 'Posyandu Melati',
      code: 'POS-01',
    } as any);

    const req = new Request('http://localhost/api/dev-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bayi Test',
        birthDate: '2024-01-01',
        gender: 'L',
        posyanduId: 'pos-1',
        dryRun: true,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.mode).toContain('DRY_RUN');
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  it('POST /api/dev-audit (mockKader bypass) berhasil saat dev belum login', async () => {
    vi.mocked(getAuthSession).mockResolvedValueOnce(null);

    vi.mocked(prisma.posyandu.findFirst).mockResolvedValueOnce({
      id: 'pos-dummy',
      name: 'Posyandu Dummy',
    } as any);

    vi.mocked(prisma.posyandu.findUnique).mockResolvedValueOnce({
      id: 'pos-dummy',
      name: 'Posyandu Dummy',
      code: 'POS-02',
    } as any);

    const req = new Request('http://localhost/api/dev-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bayi Test Bypass',
        birthDate: '2024-01-01',
        gender: 'L',
        dryRun: true,
        mockKader: true,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.steps.session.status).toBe('PASS');
    expect(json.steps.session.detail).toContain('[SIMULASI DEV]');
  });
});
