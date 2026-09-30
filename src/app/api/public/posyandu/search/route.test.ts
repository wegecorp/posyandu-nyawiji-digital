import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    posyandu: {
      findMany: vi.fn(),
    },
  },
}));

describe('GET /api/public/posyandu/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mengembalikan array kosong jika query kurang dari 2 karakter', async () => {
    const req = new Request('http://localhost/api/public/posyandu/search?q=a');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
    expect(prisma.posyandu.findMany).not.toHaveBeenCalled();
  });

  it('mencari posyandu dan memetakan struktur respons dengan benar', async () => {
    const mockPosyandus = [
      {
        id: 'pos-1',
        code: 'POS-001',
        name: 'Posyandu Melati 1',
        padukuhan: 'Wareng',
        kalurahan: { id: 'kal-1', name: 'Baleharjo' },
        healthCenter: {
          id: 'hc-1',
          code: 'PKM-WNS-1',
          name: 'Puskesmas Wonosari I',
          kapanewon: { name: 'Wonosari' },
        },
      },
    ];

    vi.mocked(prisma.posyandu.findMany).mockResolvedValueOnce(mockPosyandus as any);

    const req = new Request('http://localhost/api/public/posyandu/search?q=melati');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0]).toEqual({
      id: 'pos-1',
      code: 'POS-001',
      name: 'Posyandu Melati 1',
      padukuhan: 'Wareng',
      kalurahan: { id: 'kal-1', name: 'Baleharjo' },
      healthCenter: {
        id: 'hc-1',
        code: 'PKM-WNS-1',
        name: 'Puskesmas Wonosari I',
        kapanewon: 'Wonosari',
      },
    });
    expect(prisma.posyandu.findMany).toHaveBeenCalledTimes(1);
  });
});
