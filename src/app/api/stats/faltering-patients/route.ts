/**
 * GET /api/stats/faltering-patients?from=&to=&hcId=&posyanduId=&page=&pageSize=
 *
 * Daftar pasien 2T (2x tidak naik) dalam periode. Role-scoped, berhalaman.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSessionScope } from '@/lib/api-auth';
import { canViewPatientDetail } from '@/lib/stats-access';
import { ymOf } from '@/lib/growth-analytics';

function formatYM(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export async function GET(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES', 'PUSKESMAS', 'POSYANDU']);
    if (session instanceof NextResponse) return session;
    const scopeDenied = requireSessionScope(session);
    if (scopeDenied) return scopeDenied;
    if (!canViewPatientDetail(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dPrev = new Date(now);
    dPrev.setFullYear(dPrev.getFullYear() - 1);
    const fromDate = searchParams.get('from') ?? fmt(dPrev);
    const toDate = searchParams.get('to') ?? fmt(now);
    const fromObj = new Date(`${fromDate}T00:00:00+07:00`);
    const toExclusive = new Date(new Date(`${toDate}T00:00:00+07:00`).getTime() + 86_400_000);

    const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 20) || 20));

    // Sumber tunggal: flag 2T (hanya true untuk KMS/umur 0-60 bln, lihat ADR-0004).
    const where: Record<string, unknown> = {
      weightFaltering2T: true,
      sessionDate: { gte: fromObj, lt: toExclusive },
    };

    if (session.role === 'POSYANDU' && session.posyanduId) {
      where.posyanduId = session.posyanduId;
    } else if (session.role === 'PUSKESMAS' && session.healthCenterId) {
      where.posyandu = { healthCenterId: session.healthCenterId };
      const requestedPosyanduId = searchParams.get('posyanduId');
      if (requestedPosyanduId) where.posyanduId = requestedPosyanduId;
    } else {
      const posyanduId = searchParams.get('posyanduId');
      const hcId = searchParams.get('hcId');
      if (posyanduId) where.posyanduId = posyanduId;
      else if (hcId) where.posyandu = { healthCenterId: hcId };
    }

    const q = (searchParams.get('q') ?? '').trim();
    if (q) {
      where.patient = { OR: [{ name: { contains: q } }, { regNumber: { contains: q } }] };
    }

    const [total, rows] = await Promise.all([
      prisma.measurement.count({ where: where as never }),
      prisma.measurement.findMany({
        where: where as never,
        select: {
          id: true,
          sessionDate: true,
          weight: true,
          weightGain: true,
          patient: { select: { name: true, regNumber: true } },
          posyandu: {
            select: { name: true, kalurahan: { select: { name: true } } },
          },
        },
        orderBy: { sessionDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const data = rows.map((r) => ({
      patientName: r.patient.name,
      regNumber: r.patient.regNumber,
      meta: `${r.posyandu.name} · ${r.posyandu.kalurahan?.name ?? ''}`,
      value: r.weight != null ? `${r.weight} kg` : '-',
      note: formatYM(ymOf(r.sessionDate)),
    }));

    return NextResponse.json({ success: true, total, data, from: fromDate, to: toDate });
  } catch (error) {
    console.error('Stats faltering-patients error:', error);
    return NextResponse.json({ error: 'Gagal memuat daftar pasien 2T' }, { status: 500 });
  }
}
