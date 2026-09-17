/**
 * GET /api/stats/growth-units?indicator=&category=&from=&to=&scope=puskesmas|posyandu&hcId=&q=
 *
 * Agregat status gizi per unit (TANPA identitas pasien) — untuk drill DINKES
 * (peringkat wilayah) maupun level unit PUSKESMAS.
 * count = balita pada kategori; total = balita dinilai; percent = count/total.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import {
  latestPerPatient,
  registeredBalitaIds,
  type GrowthMeasureRow,
  type GrowthPatientRow,
} from '@/lib/growth-analytics';
import {
  computeGrowth,
  surveyCategoryKey,
  type GrowthIndex,
  type StaturePosition,
} from '@/lib/growth';

const INDICATORS: GrowthIndex[] = ['BB_U', 'TB_U', 'BB_TB', 'IMT_U'];
const SMALL_SAMPLE = 5;

function toPosition(p: string | null): StaturePosition | undefined {
  return p === 'TELENTANG' || p === 'BERDIRI' ? p : undefined;
}

export async function GET(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES', 'PUSKESMAS', 'POSYANDU']);
    if (session instanceof NextResponse) return session;

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

    const requestedScope = searchParams.get('scope');
    const scope =
      requestedScope === 'puskesmas' || requestedScope === 'posyandu'
        ? requestedScope
        : session.role === 'DINKES'
          ? 'puskesmas'
          : 'posyandu';

    const hcId = searchParams.get('hcId');
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();

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
      const ps = await prisma.posyandu.findMany({
        where: hcId ? { healthCenterId: hcId } : {},
        select: { id: true },
      });
      posyanduIds = ps.map((p) => p.id);
    }

    if (posyanduIds.length === 0) {
      return NextResponse.json({ success: true, indicator, category: categoryParam, scope, data: [] });
    }

    const [posyandus, meas, pats] = await Promise.all([
      prisma.posyandu.findMany({
        where: { id: { in: posyanduIds } },
        select: { id: true, name: true, healthCenterId: true, healthCenter: { select: { name: true } } },
      }),
      prisma.measurement.findMany({
        where: { posyanduId: { in: posyanduIds }, sessionDate: { gte: fromObj, lt: toExclusive } },
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

    const info = new Map(posyandus.map((p) => [p.id, p]));

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

    const units = new Map<string, { unitId: string; unitName: string; count: number; total: number }>();
    for (const r of latest) {
      const p = info.get(r.posyanduId);
      if (!p) continue;
      const unitId = scope === 'puskesmas' ? (p.healthCenterId ?? 'unknown') : p.id;
      const unitName = scope === 'puskesmas' ? (p.healthCenter?.name ?? 'Tidak diketahui') : p.name;
      let u = units.get(unitId);
      if (!u) {
        u = { unitId, unitName, count: 0, total: 0 };
        units.set(unitId, u);
      }
      const res = computeGrowth({
        gender: r.gender,
        birthDate: r.birthDate,
        sessionDate: r.sessionDate,
        weight: r.weight,
        height: r.height,
        position: toPosition(r.position),
      });
      const idx = res[indicator];
      if (!idx) continue;
      u.total++;
      const key = surveyCategoryKey(indicator, idx.categoryKey);
      if (categories.length === 0 || categories.includes(key)) u.count++;
    }

    const data = [...units.values()]
      // Saat menyaring kategori, sembunyikan unit tanpa kasus (0%) — list ini peringkat kasus.
      .filter((u) => u.total > 0 && (categories.length === 0 || u.count > 0) && (!q || u.unitName.toLowerCase().includes(q)))
      .map((u) => ({
        ...u,
        percent: u.total > 0 ? u.count / u.total : 0,
        smallSample: u.total < SMALL_SAMPLE,
      }))
      .sort((a, b) => b.percent - a.percent || b.count - a.count);

    return NextResponse.json({ success: true, indicator, category: categoryParam, scope, from: fromDate, to: toDate, data });
  } catch (error) {
    console.error('Stats growth-units error:', error);
    return NextResponse.json({ error: 'Gagal memuat agregat status gizi per unit' }, { status: 500 });
  }
}
