/**
 * GET /api/stats/coverage?scope=kabupaten|puskesmas|posyandu&hcId=...&posId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Agregasi partisipasi per bulan. Scope menentukan tingkat detail:
 *   - kabupaten: aggregate 1 baris per bulan (seluruh kabupaten)
 *   - puskesmas:  per 30 puskesmas per bulan (filter hcId jika drill ke 1 puskesmas → posyandu)
 *   - posyandu:   per 1 puskesmas per bulan (filter hcId)
 *
 * Response: { data: [{ ym, unitId, unitName, numerator, denominator, participation }] }
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import {
  fetchCoverageBase,
  getPosyanduInfo,
  aggregateToHealthCenter,
  aggregateToKabupaten,
  monthRange,
} from '@/lib/analytics';

export async function GET(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES', 'PUSKESMAS', 'POSYANDU']);
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') ?? 'kabupaten';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Default: last 12 months
    const now = new Date();
    const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    const defaultFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const fromDate = from ?? defaultFrom;
    const toDate = to ?? defaultTo;

    const months = monthRange(fromDate, toDate);

    // Enforce scope by role
    let effectiveScope = scope;
    if (session.role === 'PUSKESMAS') effectiveScope = 'posyandu'; // puskesmas sees own posyandu list
    if (session.role === 'POSYANDU') effectiveScope = 'posyandu';

    const base = await fetchCoverageBase(fromDate, toDate);
    const posyanduIds = [...new Set(base.map((r) => r.unitId))];
    const posyanduInfo = await getPosyanduInfo(posyanduIds);

    // Fill missing months for all units
    const allUnitIds = new Set(posyanduIds);
    // For PUSKESMAS role, also include posyandus belonging to this HC that have 0 measurements
    if (session.role === 'PUSKESMAS' && session.healthCenterId) {
      const { prisma } = await import('@/lib/prisma');
      const hcPosyandus = await prisma.posyandu.findMany({
        where: { healthCenterId: session.healthCenterId },
        select: { id: true, name: true },
      });
      for (const p of hcPosyandus) {
        allUnitIds.add(p.id);
        if (!posyanduInfo.has(p.id)) {
          posyanduInfo.set(p.id, { id: p.id, name: p.name, healthCenterId: session.healthCenterId, healthCenterName: '' });
        }
      }
    }

    let data: { ym: string; unitId: string; unitName: string; numerator: number; denominator: number; participation: number }[];

    if (effectiveScope === 'kabupaten') {
      data = aggregateToKabupaten(base, months);
    } else if (effectiveScope === 'puskesmas') {
      data = aggregateToHealthCenter(base, posyanduInfo, months);
    } else {
      // posyandu level: fill missing months for each posyandu
      const baseMap = new Map<string, { ym: string; numerator: number; denominator: number }[]>();
      for (const row of base) {
        if (!baseMap.has(row.unitId)) baseMap.set(row.unitId, []);
        baseMap.get(row.unitId)!.push({ ym: row.ym, numerator: row.numerator, denominator: row.denominator });
      }
      data = [];
      for (const uid of allUnitIds) {
        const info = posyanduInfo.get(uid);
        for (const ym of months) {
          const found = baseMap.get(uid)?.find((r) => r.ym === ym);
          data.push({
            ym,
            unitId: uid,
            unitName: info?.name ?? '',
            numerator: found?.numerator ?? 0,
            denominator: found?.denominator ?? 0,
            participation: found && found.denominator > 0 ? found.numerator / found.denominator : 0,
          });
        }
      }
    }

    return NextResponse.json({ success: true, data, from: fromDate, to: toDate });
  } catch (error) {
    console.error('Stats coverage error:', error);
    return NextResponse.json({ error: 'Gagal memuat statistik partisipasi' }, { status: 500 });
  }
}
