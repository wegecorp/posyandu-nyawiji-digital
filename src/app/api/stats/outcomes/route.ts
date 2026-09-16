/**
 * GET /api/stats/outcomes?scope=kabupaten|puskesmas|posyandu&from=...&to=...
 *
 * Agregasi hasil pengukuran (normal vs abnormal) per bulan. Role-scoped.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import {
  fetchOutcomeBase,
  classifyOutcomes,
  getPosyanduInfo,
  outcomesToHealthCenter,
} from '@/lib/analytics';

export async function GET(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES', 'PUSKESMAS', 'POSYANDU']);
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') ?? 'kabupaten';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const now = new Date();
    const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    const defaultFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const fromDate = from ?? defaultFrom;
    const toDate = to ?? defaultTo;

    const raw = await fetchOutcomeBase(fromDate, toDate);

    // Scope filter by role
    let filteredRaw = raw;
    if (session.role === 'PUSKESMAS' && session.healthCenterId) {
      const hcPosyanduIds = await prisma.posyandu.findMany({
        where: { healthCenterId: session.healthCenterId },
        select: { id: true },
      }).then((ps) => new Set(ps.map((p) => p.id)));
      filteredRaw = raw.filter((r) => hcPosyanduIds.has(r.posyanduId));
    } else if (session.role === 'POSYANDU' && session.posyanduId) {
      filteredRaw = raw.filter((r) => r.posyanduId === session.posyanduId);
    }

    const { byUnit, totals } = classifyOutcomes(filteredRaw);

    const posyanduIds = [...new Set(filteredRaw.map((r) => r.posyanduId))];
    const posyanduInfo = await getPosyanduInfo(posyanduIds);

    let data: { ym: string; unitId: string; unitName: string; total: number; normal: number; abnormal: number; notAssessed: number; abnormalByIndicator: Record<string, number>; assessedByIndicator: Record<string, number> }[];

    if (scope === 'kabupaten') {
      data = totals.map((t) => ({
        ...t,
        unitId: 'kabupaten',
        unitName: 'Kabupaten Gunungkidul',
      }));
    } else if (scope === 'puskesmas') {
      data = outcomesToHealthCenter(byUnit, posyanduInfo);
    } else {
      data = [];
      for (const [posId, rows] of byUnit) {
        const info = posyanduInfo.get(posId);
        for (const r of rows) {
          data.push({ ...r, unitName: info?.name ?? '' });
        }
      }
    }

    return NextResponse.json({ success: true, data, from: fromDate, to: toDate });
  } catch (error) {
    console.error('Stats outcomes error:', error);
    return NextResponse.json({ error: 'Gagal memuat statistik hasil pengukuran' }, { status: 500 });
  }
}
