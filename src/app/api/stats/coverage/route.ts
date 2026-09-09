/**
 * GET /api/stats/coverage?scope=kabupaten|puskesmas|posyandu&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Agregasi partisipasi per bulan. Scope menentukan tingkat detail.
 * Role-scoped: PUSKESMAS hanya lihat own HC, POSYANDU hanya lihat own posyandu.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    const hcIdFilter = searchParams.get('hcId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

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
    if (session.role === 'PUSKESMAS') effectiveScope = 'posyandu';
    if (session.role === 'POSYANDU') effectiveScope = 'posyandu';

    const base = await fetchCoverageBase(fromDate, toDate);
    const posyanduIds = [...new Set(base.map((r) => r.unitId))];
    const posyanduInfo = await getPosyanduInfo(posyanduIds);

    // Filter by explicit hcId (DINKES drill-down)
    let filteredBase = base;
    if (hcIdFilter) {
      const hcPosyanduIds = await prisma.posyandu.findMany({
        where: { healthCenterId: hcIdFilter },
        select: { id: true, name: true },
      });
      const hcSet = new Set(hcPosyanduIds.map((p) => p.id));
      filteredBase = base.filter((r) => hcSet.has(r.unitId));
      // Ensure posyanduInfo has all HC's posyandus
      for (const p of hcPosyanduIds) {
        if (!posyanduInfo.has(p.id)) {
          posyanduInfo.set(p.id, { id: p.id, name: p.name, healthCenterId: hcIdFilter, healthCenterName: '' });
        }
      }
    }

    // For PUSKESMAS: filter base to own HC, and include own posyandus with 0 measurements
    if (session.role === 'PUSKESMAS' && session.healthCenterId && !hcIdFilter) {
      const hcPosyandus = await prisma.posyandu.findMany({
        where: { healthCenterId: session.healthCenterId },
        select: { id: true, name: true },
      });
      const hcPosyanduIds = new Set(hcPosyandus.map((p) => p.id));
      filteredBase = filteredBase.filter((r) => hcPosyanduIds.has(r.unitId));
      for (const p of hcPosyandus) {
        if (!posyanduInfo.has(p.id)) {
          posyanduInfo.set(p.id, { id: p.id, name: p.name, healthCenterId: session.healthCenterId, healthCenterName: '' });
        }
      }
    }

    // For POSYANDU: ensure own posyandu is included even with 0 measurements
    if (session.role === 'POSYANDU' && session.posyanduId) {
      const ownPosyandu = await prisma.posyandu.findUnique({
        where: { id: session.posyanduId },
        select: { id: true, name: true },
      });
      if (ownPosyandu && !posyanduInfo.has(ownPosyandu.id)) {
        posyanduInfo.set(ownPosyandu.id, { id: ownPosyandu.id, name: ownPosyandu.name, healthCenterId: session.healthCenterId ?? undefined, healthCenterName: '' });
      }
    }

    // Build allUnitIds from filtered base + role-specific additions
    const allUnitIds = new Set(filteredBase.map((r) => r.unitId));
    // Ensure PUSKESMAS's own posyandus (including 0-measurement) are included
    if (session.role === 'PUSKESMAS' && session.healthCenterId) {
      const hcPosyandus = await prisma.posyandu.findMany({
        where: { healthCenterId: session.healthCenterId },
        select: { id: true },
      });
      for (const p of hcPosyandus) allUnitIds.add(p.id);
    }
    // Ensure POSYANDU's own posyandu is always included
    if (session.role === 'POSYANDU' && session.posyanduId) {
      allUnitIds.add(session.posyanduId);
    }

    let data: { ym: string; unitId: string; unitName: string; numerator: number; denominator: number; participation: number }[];

    if (effectiveScope === 'kabupaten') {
      data = aggregateToKabupaten(filteredBase, months);
    } else if (effectiveScope === 'puskesmas') {
      data = aggregateToHealthCenter(filteredBase, posyanduInfo, months);
    } else {
      // posyandu level: fill missing months for each posyandu
      const baseMap = new Map<string, { ym: string; numerator: number; denominator: number }[]>();
      for (const row of filteredBase) {
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
