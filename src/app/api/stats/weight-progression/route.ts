/**
 * GET /api/stats/weight-progression?from=YYYY-MM-DD&to=YYYY-MM-DD&hcId=
 *
 * Agregasi progres berat badan (N/T & 2T) per posyandu per bulan, plus daftar
 * pantau pasien 2T. Role-scoped: DINKES (semua), PUSKESMAS (HC sendiri),
 * POSYANDU (posyandu sendiri).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { getPosyanduInfo } from '@/lib/analytics';
import { ymOf } from '@/lib/growth-analytics';

export async function GET(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES', 'PUSKESMAS', 'POSYANDU']);
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dPrev = new Date(now);
    dPrev.setFullYear(dPrev.getFullYear() - 1);
    const fromDate = searchParams.get('from') ?? fmt(dPrev);
    const toDate = searchParams.get('to') ?? fmt(now);
    const fromObj = new Date(`${fromDate}T00:00:00`);
    const toExclusive = new Date(`${toDate}T00:00:00`);
    toExclusive.setDate(toExclusive.getDate() + 1);

    // Resolve posyandu scope.
    let posyanduIds: string[] = [];
    if (session.role === 'POSYANDU' && session.posyanduId) {
      posyanduIds = [session.posyanduId];
    } else if (session.role === 'PUSKESMAS' && session.healthCenterId) {
      const ps = await prisma.posyandu.findMany({
        where: { healthCenterId: session.healthCenterId },
        select: { id: true },
      });
      posyanduIds = ps.map((p) => p.id);
    } else {
      const hcId = searchParams.get('hcId');
      const ps = await prisma.posyandu.findMany({
        where: hcId ? { healthCenterId: hcId } : {},
        select: { id: true },
      });
      posyanduIds = ps.map((p) => p.id);
    }

    if (posyanduIds.length === 0) {
      return NextResponse.json({ success: true, data: [], faltering: [], from: fromDate, to: toDate });
    }

    const where = {
      posyanduId: { in: posyanduIds },
      sessionDate: { gte: fromObj, lt: toExclusive },
    };

    const [meas, falteringRows, info] = await Promise.all([
      prisma.measurement.findMany({
        where,
        select: { posyanduId: true, sessionDate: true, weight: true, weightStatus: true, weightFaltering2T: true },
      }),
      prisma.measurement.findMany({
        where: { ...where, weightFaltering2T: true },
        select: {
          id: true,
          sessionDate: true,
          weight: true,
          weightGain: true,
          ageInMonths: true,
          patient: { select: { name: true, regNumber: true } },
          posyandu: { select: { id: true, name: true, kalurahan: { select: { name: true } } } },
        },
        orderBy: { sessionDate: 'desc' },
        take: 500,
      }),
      getPosyanduInfo(posyanduIds),
    ]);

    type Agg = {
      ym: string;
      posyanduId: string;
      total: number;
      naik: number;
      tidakNaik: number;
      duaT: number;
      belumDinilai: number;
    };
    const map = new Map<string, Agg>();
    for (const m of meas) {
      const ym = ymOf(m.sessionDate);
      const key = `${m.posyanduId}|${ym}`;
      let agg = map.get(key);
      if (!agg) {
        agg = { ym, posyanduId: m.posyanduId, total: 0, naik: 0, tidakNaik: 0, duaT: 0, belumDinilai: 0 };
        map.set(key, agg);
      }
      agg.total++;
      if (m.weightStatus === 'NAIK') agg.naik++;
      else if (m.weightStatus === 'TIDAK_NAIK') agg.tidakNaik++;
      else agg.belumDinilai++;
      if (m.weightFaltering2T) agg.duaT++;
    }

    const data = [...map.values()]
      .map((a) => {
        const infoRow = info.get(a.posyanduId);
        return {
          ...a,
          posyanduName: infoRow?.name ?? '',
          healthCenterId: infoRow?.healthCenterId ?? null,
          healthCenterName: infoRow?.healthCenterName ?? null,
        };
      })
      .sort((a, b) => a.ym.localeCompare(b.ym) || a.posyanduName.localeCompare(b.posyanduName));

    const faltering = falteringRows.map((r) => ({
      measurementId: r.id,
      patientName: r.patient.name,
      regNumber: r.patient.regNumber,
      sessionDate: r.sessionDate,
      weight: r.weight,
      weightGain: r.weightGain,
      ageInMonths: r.ageInMonths,
      posyanduId: r.posyandu.id,
      posyanduName: r.posyandu.name,
      kalurahan: r.posyandu.kalurahan?.name ?? '',
      ym: ymOf(r.sessionDate),
    }));

    return NextResponse.json({ success: true, data, faltering, from: fromDate, to: toDate });
  } catch (error) {
    console.error('Stats weight-progression error:', error);
    return NextResponse.json({ error: 'Gagal memuat statistik progres berat' }, { status: 500 });
  }
}
