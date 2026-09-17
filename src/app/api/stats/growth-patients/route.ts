/**
 * GET /api/stats/growth-patients?indicator=BB_U&category=<key>&from=&to=&hcId=&posyanduId=&page=&pageSize=
 *
 * Daftar balita (pengukuran terakhir dalam periode) untuk satu kategori status gizi.
 * Dipakai drill-down dari pie "Distribusi Status Gizi Balita". Role-scoped.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { canViewPatientDetail } from '@/lib/stats-access';
import {
  latestPerPatient,
  registeredBalitaIds,
  type GrowthMeasureRow,
  type GrowthPatientRow,
} from '@/lib/growth-analytics';
import {
  computeGrowth,
  surveyCategoryKey,
  findCategory,
  ageInCompletedMonths,
  type GrowthIndex,
  type StaturePosition,
} from '@/lib/growth';

const INDICATORS: GrowthIndex[] = ['BB_U', 'TB_U', 'BB_TB', 'IMT_U'];

function toPosition(p: string | null): StaturePosition | undefined {
  return p === 'TELENTANG' || p === 'BERDIRI' ? p : undefined;
}

export async function GET(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES', 'PUSKESMAS', 'POSYANDU']);
    if (session instanceof NextResponse) return session;
    if (!canViewPatientDetail(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const rawIndicator = (searchParams.get('indicator') ?? 'BB_U').toUpperCase().replace('-', '_');
    const indicator = (INDICATORS as string[]).includes(rawIndicator)
      ? (rawIndicator as GrowthIndex)
      : 'BB_U';
    const categoryParam = searchParams.get('category');
    const categories = (categoryParam ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dPrev = new Date(now);
    dPrev.setFullYear(dPrev.getFullYear() - 1);
    const fromDate = searchParams.get('from') ?? fmt(dPrev);
    const toDate = searchParams.get('to') ?? fmt(now);

    const fromObj = new Date(`${fromDate}T00:00:00`);
    const toObj = new Date(`${toDate}T00:00:00`);
    const toExclusive = new Date(toObj.getTime() + 86_400_000);

    const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 20) || 20));
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();

    // Resolve posyandu scope.
    let posyanduIds: string[] = [];
    const requestedPosyanduId = searchParams.get('posyanduId');
    if (session.role === 'POSYANDU' && session.posyanduId) {
      posyanduIds = [session.posyanduId];
    } else if (session.role === 'PUSKESMAS' && session.healthCenterId) {
      const ps = await prisma.posyandu.findMany({
        where: {
          healthCenterId: session.healthCenterId,
          ...(requestedPosyanduId ? { id: requestedPosyanduId } : {}),
        },
        select: { id: true },
      });
      posyanduIds = ps.map((p) => p.id);
    } else {
      const hcId = searchParams.get('hcId');
      const ps = await prisma.posyandu.findMany({
        where: requestedPosyanduId ? { id: requestedPosyanduId } : hcId ? { healthCenterId: hcId } : {},
        select: { id: true },
      });
      posyanduIds = ps.map((p) => p.id);
    }

    if (posyanduIds.length === 0) {
      return NextResponse.json({ success: true, data: [], total: 0, indicator, category: categoryParam });
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
          patient: { select: { name: true, regNumber: true, gender: true, birthDate: true } },
          posyandu: {
            select: { name: true, kalurahan: { select: { name: true } }, healthCenter: { select: { name: true } } },
          },
        },
      }),
      prisma.patient.findMany({
        where: { posyanduId: { in: posyanduIds } },
        select: { id: true, posyanduId: true, gender: true, birthDate: true },
      }),
    ]);

    const rows: GrowthMeasureRow[] = meas.map((m) => ({
      patientId: m.patientId,
      posyanduId: m.posyanduId,
      sessionDate: m.sessionDate,
      weight: m.weight,
      height: m.height,
      position: m.position,
      gender: m.patient.gender,
      birthDate: m.patient.birthDate,
    }));

    const patientRows: GrowthPatientRow[] = pats.map((p) => ({
      id: p.id,
      posyanduId: p.posyanduId,
      gender: p.gender,
      birthDate: p.birthDate,
    }));

    const registered = registeredBalitaIds(patientRows, toObj);
    const latest = latestPerPatient(rows).filter((r) => registered.has(r.patientId));

    const infoByPatient = new Map(
      meas.map((m) => [
        m.patientId,
        {
          name: m.patient.name,
          regNumber: m.patient.regNumber,
          gender: m.patient.gender,
          posyanduName: m.posyandu.name,
          kalurahan: m.posyandu.kalurahan?.name ?? '',
          healthCenterName: m.posyandu.healthCenter?.name ?? '',
        },
      ]),
    );

    const matched = latest
      .map((r) => {
        const res = computeGrowth({
          gender: r.gender,
          birthDate: r.birthDate,
          sessionDate: r.sessionDate,
          weight: r.weight,
          height: r.height,
          position: toPosition(r.position),
        });
        const idx = res[indicator];
        if (!idx) return null;
        const key = surveyCategoryKey(indicator, idx.categoryKey);
        if (categories.length > 0 && !categories.includes(key)) return null;
        const info = infoByPatient.get(r.patientId);
        if (!info) return null;
        return {
          patientId: r.patientId,
          patientName: info.name,
          regNumber: info.regNumber,
          meta: `${info.posyanduName} · ${info.kalurahan} · ${info.healthCenterName}`,
          value: `Z ${idx.z.toFixed(2)}`,
          note: findCategory(indicator, idx.categoryKey)?.label ?? idx.categoryKey,
          ageMonths: ageInCompletedMonths(r.birthDate, r.sessionDate),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .filter((x) => !q || x.patientName.toLowerCase().includes(q) || x.regNumber.toLowerCase().includes(q))
      .sort((a, b) => a.patientName.localeCompare(b.patientName));

    const total = matched.length;
    const start = (page - 1) * pageSize;
    const data = matched.slice(start, start + pageSize);

    return NextResponse.json({
      success: true,
      indicator,
      category: categoryParam,
      from: fromDate,
      to: toDate,
      total,
      data,
    });
  } catch (error) {
    console.error('Stats growth-patients error:', error);
    return NextResponse.json({ error: 'Gagal memuat daftar pasien status gizi' }, { status: 500 });
  }
}
