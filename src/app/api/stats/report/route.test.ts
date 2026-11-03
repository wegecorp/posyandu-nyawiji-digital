/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { resolveReportPosyanduIds } from '@/lib/patient-scope';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    posyandu: {
      findMany: vi.fn(),
    },
    patient: {
      findMany: vi.fn(),
    },
    measurement: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-auth', () => ({
  requireRole: vi.fn(),
}));

vi.mock('@/lib/patient-scope', () => ({
  resolveReportPosyanduIds: vi.fn(),
}));

describe('GET /api/stats/report - Filter per kelompok sasaran', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const session = {
    id: 'u1',
    username: 'kader1',
    role: 'POSYANDU',
    posyanduId: 'pos-1',
  };

  const dummyPosyandus = [{ id: 'pos-1', name: 'Posyandu Melati', healthCenterId: 'pkm-1' }];

  const dummyPatients = [
    {
      id: 'p-bayi',
      posyanduId: 'pos-1',
      createdAt: new Date('2025-01-01'),
      birthDate: new Date('2025-10-01'),
      gender: 'L',
      isPregnant: false,
    },
    {
      id: 'p-lansia',
      posyanduId: 'pos-1',
      createdAt: new Date('2025-01-01'),
      birthDate: new Date('1950-01-01'),
      gender: 'P',
      isPregnant: false,
    },
  ];

  const dummyMeas = [
    {
      patientId: 'p-bayi',
      posyanduId: 'pos-1',
      sessionDate: new Date('2026-03-01'),
      weight: 6,
      height: 62,
      position: 'TELENTANG',
      category: 'BAYI',
      weightStatus: 'NAIK',
      weightFaltering2T: false,
      systolic: null,
      diastolic: null,
      hemoglobin: null,
      bloodSugar: null,
      cholesterol: null,
      uricAcid: null,
      visionStatus: null,
      hearingStatus: null,
      tbScreeningStatus: null,
      patient: { gender: 'L', birthDate: new Date('2025-10-01'), isPregnant: false },
    },
    {
      patientId: 'p-lansia',
      posyanduId: 'pos-1',
      sessionDate: new Date('2026-03-01'),
      weight: 55,
      height: 155,
      position: null,
      category: 'LANSIA',
      weightStatus: null,
      weightFaltering2T: false,
      systolic: 140,
      diastolic: 90,
      hemoglobin: null,
      bloodSugar: null,
      cholesterol: null,
      uricAcid: null,
      visionStatus: null,
      hearingStatus: null,
      tbScreeningStatus: null,
      patient: { gender: 'P', birthDate: new Date('1950-01-01'), isPregnant: false },
    },
  ];

  it('menyaring data preview jika parameter categories diberikan', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(session as any);
    vi.mocked(resolveReportPosyanduIds).mockReturnValueOnce({
      ok: true,
      ids: ['pos-1'],
    });

    vi.mocked(prisma.posyandu.findMany).mockResolvedValueOnce(dummyPosyandus as any);
    vi.mocked(prisma.patient.findMany).mockResolvedValueOnce(dummyPatients as any);
    vi.mocked(prisma.measurement.findMany).mockResolvedValueOnce(dummyMeas as any);

    const req = new Request('http://localhost/api/stats/report?from=2026-01-01&to=2026-03-31&categories=LANSIA');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.categoriesLabel).toBe('LANSIA');
    // Hanya lansia yang terhitung di registered & measured
    expect(json.estimates.patients).toBe(1);
    expect(json.estimates.measurements).toBe(1);
    expect(json.global.registered).toBe(1);
    expect(json.global.measured).toBe(1);
    // Balita total harus 0 karena filter LANSIA
    expect(json.global.balita.total).toBe(0);
  });

  it('mengikutsertakan semua sasaran jika categories kosong', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(session as any);
    vi.mocked(resolveReportPosyanduIds).mockReturnValueOnce({
      ok: true,
      ids: ['pos-1'],
    });

    vi.mocked(prisma.posyandu.findMany).mockResolvedValueOnce(dummyPosyandus as any);
    vi.mocked(prisma.patient.findMany).mockResolvedValueOnce(dummyPatients as any);
    vi.mocked(prisma.measurement.findMany).mockResolvedValueOnce(dummyMeas as any);

    const req = new Request('http://localhost/api/stats/report?from=2026-01-01&to=2026-03-31');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.estimates.patients).toBe(2);
    expect(json.estimates.measurements).toBe(2);
    expect(json.global.registered).toBe(2);
    expect(json.global.measured).toBe(2);
    expect(json.global.balita.total).toBe(1);
  });

  it('menghasilkan header Content-Disposition dengan label kategori pada format=xlsx', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(session as any);
    vi.mocked(resolveReportPosyanduIds).mockReturnValueOnce({
      ok: true,
      ids: ['pos-1'],
    });

    vi.mocked(prisma.posyandu.findMany).mockResolvedValueOnce(dummyPosyandus as any);
    vi.mocked(prisma.patient.findMany).mockResolvedValueOnce(dummyPatients as any);
    vi.mocked(prisma.measurement.findMany).mockResolvedValueOnce(dummyMeas as any);

    const req = new Request(
      'http://localhost/api/stats/report?from=2026-01-01&to=2026-03-31&categories=LANSIA&format=xlsx',
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const disp = res.headers.get('Content-Disposition');
    expect(disp).toContain('Rekap_Posyandu-Melati_LANSIA_2026-01-01_2026-03-31.xlsx');
  });
});
