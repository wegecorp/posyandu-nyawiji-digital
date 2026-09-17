/**
 * GET /api/stats/growth?indicator=BB_U|TB_U|BB_TB|IMT_U&from=YYYY-MM-DD&to=YYYY-MM-DD
 *     &hcId=&gender=
 *
 * Distribusi status gizi balita (Permenkes 2/2020) + tren bulanan.
 * Role-scoped: DINKES (semua), PUSKESMAS (HC sendiri), POSYANDU (posyandu sendiri).
 * Denomintor pie = pengukuran terakhir per anak dalam periode (dedupe).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSessionScope } from '@/lib/api-auth';
import {
  latestPerPatient,
  problemRate,
  registeredBalitaIds,
  statusCounts,
  statusTrend,
  type GrowthMeasureRow,
  type GrowthPatientRow,
} from '@/lib/growth-analytics';
import type { GrowthIndex } from '@/lib/growth';

const INDICATORS: GrowthIndex[] = ['BB_U', 'TB_U', 'BB_TB', 'IMT_U'];

export async function GET(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES', 'PUSKESMAS', 'POSYANDU']);
    if (session instanceof NextResponse) return session;
    const scopeDenied = requireSessionScope(session);
    if (scopeDenied) return scopeDenied;

    const { searchParams } = new URL(req.url);
    const rawIndicator = (searchParams.get('indicator') ?? 'BB_U').toUpperCase().replace('-', '_');
    const indicator = (INDICATORS as string[]).includes(rawIndicator)
      ? (rawIndicator as GrowthIndex)
      : 'BB_U';
    const gender = searchParams.get('gender');

    const now = new Date();
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const defaultTo = fmt(now);
    const dPrev = new Date(now);
    dPrev.setFullYear(dPrev.getFullYear() - 1);
    const fromDate = searchParams.get('from') ?? fmt(dPrev);
    const toDate = searchParams.get('to') ?? defaultTo;

    const fromObj = new Date(`${fromDate}T00:00:00`);
    const toObj = new Date(`${toDate}T00:00:00`);
    const toExclusive = new Date(toObj.getTime() + 86_400_000);

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
      return NextResponse.json({
        success: true,
        indicator,
        from: fromDate,
        to: toDate,
        summary: { total: 0, measured: 0, registered: 0, unmeasured: 0 },
        categories: statusCounts([], indicator).categories,
        trend: [],
      });
    }

    const [meas, pats] = await Promise.all([
      prisma.measurement.findMany({
        where: {
          posyanduId: { in: posyanduIds },
          sessionDate: { gte: fromObj, lt: toExclusive },
        },
        select: {
          patientId: true,
          posyanduId: true,
          sessionDate: true,
          weight: true,
          height: true,
          position: true,
          patient: { select: { gender: true, birthDate: true } },
        },
      }),
      prisma.patient.findMany({
        where: { posyanduId: { in: posyanduIds } },
        select: { id: true, posyanduId: true, gender: true, birthDate: true },
      }),
    ]);

    const rows: GrowthMeasureRow[] = meas
      .filter((m) => !gender || m.patient.gender === gender)
      .map((m) => ({
        patientId: m.patientId,
        posyanduId: m.posyanduId,
        sessionDate: m.sessionDate,
        weight: m.weight,
        height: m.height,
        position: m.position,
        gender: m.patient.gender,
        birthDate: m.patient.birthDate,
      }));

    const patientRows: GrowthPatientRow[] = (gender ? pats.filter((p) => p.gender === gender) : pats).map(
      (p) => ({ id: p.id, posyanduId: p.posyanduId, gender: p.gender, birthDate: p.birthDate }),
    );

    const registered = registeredBalitaIds(patientRows, toObj);
    const measuredIds = new Set(rows.map((r) => r.patientId));
    const measuredBalita = [...measuredIds].filter((id) => registered.has(id));

    // Batasi ke balita yang terdaftar pada akhir periode agar `total` konsisten
    // dengan `measured`/`registered` (F7: denominator tidak tercampur).
    const latest = latestPerPatient(rows).filter((r) => registered.has(r.patientId));
    const { total, categories } = statusCounts(latest, indicator);
    const trend = statusTrend(rows, indicator).map((t) => ({ ...t, problemRate: problemRate(t.categories) }));

    return NextResponse.json({
      success: true,
      indicator,
      from: fromDate,
      to: toDate,
      summary: {
        total,
        measured: measuredBalita.length,
        registered: registered.size,
        unmeasured: Math.max(0, registered.size - measuredBalita.length),
      },
      categories,
      trend,
    });
  } catch (error) {
    console.error('Stats growth error:', error);
    return NextResponse.json({ error: 'Gagal memuat statistik status gizi' }, { status: 500 });
  }
}
