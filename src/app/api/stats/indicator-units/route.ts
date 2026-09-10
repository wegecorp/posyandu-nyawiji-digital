/**
 * GET /api/stats/indicator-units?indicator=hypertension&from=&to=&scope=puskesmas|posyandu
 *
 * Peringkat unit berdasarkan prevalensi temuan satu indikator klinis
 * (temuan / pasien yang diperiksa untuk indikator itu) dalam periode. Role-scoped.
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { INDICATORS, type IndicatorKey } from '@/lib/clinical';
import {
  fetchOutcomeBase,
  classifyOutcomes,
  outcomesToHealthCenter,
  getPosyanduInfo,
} from '@/lib/analytics';

const SMALL_SAMPLE = 5;

export async function GET(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES', 'PUSKESMAS', 'POSYANDU']);
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const indicator = searchParams.get('indicator') as IndicatorKey | null;
    if (!indicator || !INDICATORS.some((i) => i.key === indicator)) {
      return NextResponse.json({ error: 'Indikator tidak valid' }, { status: 400 });
    }
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();

    const now = new Date();
    const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    const defaultFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const fromDate = searchParams.get('from') ?? defaultFrom;
    const toDate = searchParams.get('to') ?? defaultTo;

    const raw = await fetchOutcomeBase(fromDate, toDate);

    let filteredRaw = raw;
    if (session.role === 'PUSKESMAS' && session.healthCenterId) {
      const ids = await prisma.posyandu
        .findMany({ where: { healthCenterId: session.healthCenterId }, select: { id: true } })
        .then((ps) => new Set(ps.map((p) => p.id)));
      filteredRaw = raw.filter((r) => ids.has(r.posyanduId));
    } else if (session.role === 'POSYANDU' && session.posyanduId) {
      filteredRaw = raw.filter((r) => r.posyanduId === session.posyanduId);
    } else {
      const hcId = searchParams.get('hcId');
      if (hcId) {
        const ids = await prisma.posyandu
          .findMany({ where: { healthCenterId: hcId }, select: { id: true } })
          .then((ps) => new Set(ps.map((p) => p.id)));
        filteredRaw = raw.filter((r) => ids.has(r.posyanduId));
      }
    }

    const { byUnit } = classifyOutcomes(filteredRaw);

    // Scope: DINKES default per-puskesmas, PUSKESMAS/POSYANDU per-posyandu.
    const requestedScope = searchParams.get('scope');
    const scope =
      requestedScope === 'puskesmas' || requestedScope === 'posyandu'
        ? requestedScope
        : session.role === 'DINKES'
          ? 'puskesmas'
          : 'posyandu';

    const sums = new Map<string, { abnormal: number; assessed: number; unitName: string }>();

    function add(unitId: string, unitName: string, abnormal: number, assessed: number) {
      const cur = sums.get(unitId) ?? { abnormal: 0, assessed: 0, unitName };
      cur.abnormal += abnormal;
      cur.assessed += assessed;
      if (unitName) cur.unitName = unitName;
      sums.set(unitId, cur);
    }

    if (scope === 'puskesmas') {
      const posyanduIds = [...new Set(filteredRaw.map((r) => r.posyanduId))];
      const info = await getPosyanduInfo(posyanduIds);
      const rows = outcomesToHealthCenter(byUnit, info);
      for (const r of rows) {
        add(r.unitId, r.unitName, r.abnormalByIndicator[indicator] ?? 0, r.assessedByIndicator[indicator] ?? 0);
      }
    } else {
      const posyanduIds = [...new Set(filteredRaw.map((r) => r.posyanduId))];
      const info = await getPosyanduInfo(posyanduIds);
      for (const [posId, rows] of byUnit) {
        for (const r of rows) {
          add(
            posId,
            info.get(posId)?.name ?? '',
            r.abnormalByIndicator[indicator] ?? 0,
            r.assessedByIndicator[indicator] ?? 0,
          );
        }
      }
    }

    const data = [...sums.entries()]
      .map(([unitId, v]) => ({
        unitId,
        unitName: v.unitName || 'Tidak diketahui',
        abnormal: v.abnormal,
        assessed: v.assessed,
        prevalence: v.assessed > 0 ? v.abnormal / v.assessed : 0,
        smallSample: v.assessed < SMALL_SAMPLE,
      }))
      .filter((u) => u.assessed > 0)
      .filter((u) => !q || u.unitName.toLowerCase().includes(q))
      .sort((a, b) => b.prevalence - a.prevalence || b.abnormal - a.abnormal);

    const label = INDICATORS.find((i) => i.key === indicator)?.label ?? indicator;

    return NextResponse.json({
      success: true,
      indicator,
      label,
      scope,
      from: fromDate,
      to: toDate,
      data,
    });
  } catch (error) {
    console.error('Stats indicator-units error:', error);
    return NextResponse.json({ error: 'Gagal memuat peringkat unit indikator' }, { status: 500 });
  }
}
