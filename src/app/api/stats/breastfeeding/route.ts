/**
 * GET /api/stats/breastfeeding?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Cakupan ASI Eksklusif per posyandu per bulan (bayi 0-5 bln).
 * Role-scoped: POSYANDU sendiri, PUSKESMAS se-HC, DINKES semua.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { getPosyanduInfo } from '@/lib/analytics';
import { aggregateBreastfeeding } from '@/lib/coverage-analytics';

export async function GET(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES', 'PUSKESMAS', 'POSYANDU']);
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const fromDate = searchParams.get('from') ?? fmt(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
    const toDate = searchParams.get('to') ?? fmt(now);
    const fromObj = new Date(`${fromDate}T00:00:00`);
    const toExclusive = new Date(new Date(`${toDate}T00:00:00`).getTime() + 86_400_000);

    // Scope per peran (fail-closed).
    let posyanduFilter: string[] | null = null;
    if (session.role === 'POSYANDU') {
      posyanduFilter = session.posyanduId ? [session.posyanduId] : [];
    } else if (session.role === 'PUSKESMAS') {
      if (!session.healthCenterId) return NextResponse.json({ success: true, data: [], from: fromDate, to: toDate });
      const ps = await prisma.posyandu.findMany({
        where: { healthCenterId: session.healthCenterId },
        select: { id: true },
      });
      posyanduFilter = ps.map((p) => p.id);
    }

    const meas = await prisma.measurement.findMany({
      where: {
        sessionDate: { gte: fromObj, lt: toExclusive },
        exclusiveBreastfeeding: { not: null },
        ageInMonths: { lt: 6 },
        ...(posyanduFilter ? { posyanduId: { in: posyanduFilter } } : {}),
      },
      select: { posyanduId: true, patientId: true, sessionDate: true, exclusiveBreastfeeding: true },
    });

    const agg = aggregateBreastfeeding(meas);
    const info = await getPosyanduInfo([...new Set(agg.map((a) => a.unitId))]);
    const data = agg
      .map((a) => ({ ...a, unitName: info.get(a.unitId)?.name ?? '' }))
      .sort((x, y) => x.ym.localeCompare(y.ym) || x.unitName.localeCompare(y.unitName));

    return NextResponse.json({ success: true, data, from: fromDate, to: toDate });
  } catch (error) {
    console.error('Stats breastfeeding error:', error);
    return NextResponse.json({ error: 'Gagal memuat statistik ASI Eksklusif' }, { status: 500 });
  }
}
