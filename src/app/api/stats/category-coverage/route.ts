/**
 * GET /api/stats/category-coverage?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Cakupan per kelompok sasaran (Bayi, Balita & Apras, Remaja, Dewasa, Lansia,
 * Bumil) per bulan: terukur / terdaftar. Role-scoped.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, assertHcFilter, requireSessionScope } from '@/lib/api-auth';
import { monthRange } from '@/lib/analytics';
import { categoryCoverage } from '@/lib/coverage-analytics';

export async function GET(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES', 'PUSKESMAS', 'POSYANDU']);
    if (session instanceof NextResponse) return session;
    const scopeDenied = requireSessionScope(session);
    if (scopeDenied) return scopeDenied;

    const { searchParams } = new URL(req.url);
    const hcId = searchParams.get('hcId');
    const denied = assertHcFilter(session, hcId);
    if (denied) return denied;
    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let fromDate = searchParams.get('from') ?? fmt(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
    const toDate = searchParams.get('to') ?? fmt(now);

    // Batas periode: role bawah 12 bulan, DINKES 24 bulan.
    const maxMonths = session.role === 'DINKES' ? 24 : 12;
    const minFrom = new Date(`${toDate}T00:00:00`);
    minFrom.setMonth(minFrom.getMonth() - maxMonths);
    if (new Date(`${fromDate}T00:00:00`) < minFrom) fromDate = fmt(minFrom);

    const fromObj = new Date(`${fromDate}T00:00:00`);
    const toExclusive = new Date(new Date(`${toDate}T00:00:00`).getTime() + 86_400_000);

    // Scope per peran.
    let posyanduFilter: string[] | null = null;
    if (session.role === 'POSYANDU') {
      posyanduFilter = session.posyanduId ? [session.posyanduId] : [];
    } else if (session.role === 'PUSKESMAS') {
      if (!session.healthCenterId) {
        return NextResponse.json({ success: true, data: [], from: fromDate, to: toDate });
      }
      const ps = await prisma.posyandu.findMany({
        where: { healthCenterId: session.healthCenterId },
        select: { id: true },
      });
      posyanduFilter = ps.map((p) => p.id);
    } else if (hcId) {
      const ps = await prisma.posyandu.findMany({
        where: { healthCenterId: hcId },
        select: { id: true },
      });
      posyanduFilter = ps.map((p) => p.id);
    }
    const scopeWhere = posyanduFilter ? { in: posyanduFilter } : undefined;

    const [patients, meas] = await Promise.all([
      prisma.patient.findMany({
        where: scopeWhere ? { posyanduId: scopeWhere } : {},
        select: {
          id: true,
          createdAt: true,
          birthDate: true,
          gender: true,
          isPregnant: true,
        },
      }),
      prisma.measurement.findMany({
        where: {
          sessionDate: { gte: fromObj, lt: toExclusive },
          ...(scopeWhere ? { posyanduId: scopeWhere } : {}),
        },
        select: { patientId: true, sessionDate: true },
      }),
    ]);

    const months = monthRange(fromDate, toDate);
    const data = categoryCoverage(patients, meas, months);

    return NextResponse.json({ success: true, data, from: fromDate, to: toDate });
  } catch (error) {
    console.error('Stats category-coverage error:', error);
    return NextResponse.json({ error: 'Gagal memuat cakupan per kelompok' }, { status: 500 });
  }
}
