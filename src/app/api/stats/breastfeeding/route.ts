/**
 * GET /api/stats/breastfeeding?from=YYYY-MM-DD&to=YYYY-MM-DD&scope=puskesmas|posyandu&hcId=&q=
 *
 * Cakupan ASI Eksklusif per unit per bulan (bayi 0-5 bln).
 * Role-scoped: POSYANDU sendiri, PUSKESMAS se-HC, DINKES semua.
 * Default scope: DINKES per-puskesmas (agregat wilayah), lainnya per-posyandu.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSessionScope } from '@/lib/api-auth';
import { getPosyanduInfo } from '@/lib/analytics';
import {
  aggregateBreastfeeding,
  rollupBreastfeedingToHealthCenter,
  type BreastfeedingWithHc,
} from '@/lib/coverage-analytics';

export async function GET(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES', 'PUSKESMAS', 'POSYANDU']);
    if (session instanceof NextResponse) return session;
    const scopeDenied = requireSessionScope(session);
    if (scopeDenied) return scopeDenied;

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const fromDate = searchParams.get('from') ?? fmt(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
    const toDate = searchParams.get('to') ?? fmt(now);
    const fromObj = new Date(`${fromDate}T00:00:00`);
    const toExclusive = new Date(new Date(`${toDate}T00:00:00`).getTime() + 86_400_000);

    const requestedScope = searchParams.get('scope');
    const scope =
      requestedScope === 'puskesmas' || requestedScope === 'posyandu'
        ? requestedScope
        : session.role === 'DINKES'
          ? 'puskesmas'
          : 'posyandu';
    const hcId = searchParams.get('hcId');
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();

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
    } else if (hcId) {
      const ps = await prisma.posyandu.findMany({
        where: { healthCenterId: hcId },
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

    const posyanduRows: BreastfeedingWithHc[] = agg.map((a) => ({
      ...a,
      unitName: info.get(a.unitId)?.name ?? '',
      healthCenterId: info.get(a.unitId)?.healthCenterId ?? null,
      healthCenterName: info.get(a.unitId)?.healthCenterName ?? null,
    }));

    // Rollup ke puskesmas (untuk DINKES / scope=puskesmas).
    const rows =
      scope === 'puskesmas' ? rollupBreastfeedingToHealthCenter(posyanduRows) : posyanduRows;

    const data = rows
      .filter((r) => !q || r.unitName.toLowerCase().includes(q))
      .map((r) => ({
        ym: r.ym,
        unitId: r.unitId,
        unitName: r.unitName,
        assessed: r.assessed,
        exclusive: r.exclusive,
        percent: r.assessed > 0 ? Math.round((r.exclusive / r.assessed) * 100) : 0,
      }))
      .sort((x, y) => x.ym.localeCompare(y.ym) || x.unitName.localeCompare(y.unitName));

    return NextResponse.json({ success: true, scope, data, from: fromDate, to: toDate });
  } catch (error) {
    console.error('Stats breastfeeding error:', error);
    return NextResponse.json({ error: 'Gagal memuat statistik ASI Eksklusif' }, { status: 500 });
  }
}
