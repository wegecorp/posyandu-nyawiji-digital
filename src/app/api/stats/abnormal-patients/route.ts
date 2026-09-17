/**
 * GET /api/stats/abnormal-patients?indicator=...&ym=YYYY-MM&from=...&to=...
 *
 * Daftar pasien dengan pengukuran abnormal. Role-scoped.
 */

import { NextResponse } from 'next/server';
import { requireRole, requireSessionScope } from '@/lib/api-auth';
import { canViewPatientDetail } from '@/lib/stats-access';
import { prisma } from '@/lib/prisma';
import { INDICATORS, checkIndicator } from '@/lib/clinical';
import { ymOf } from '@/lib/growth-analytics';
import type { PatientCategory } from '@/lib/types';

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
    const indicatorKey = searchParams.get('indicator');
    const ym = searchParams.get('ym');

    const now = new Date();
    const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    const defaultFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const fromDate = searchParams.get('from') ?? defaultFrom;
    const toDate = searchParams.get('to') ?? defaultTo;

    // Build where clause with proper date handling
    const toDateObj = new Date(`${toDate}T23:59:59.999`);
    const fromDateObj = new Date(`${fromDate}T00:00:00.000`);

    const where: Record<string, unknown> = {
      sessionDate: { gte: fromDateObj, lte: toDateObj },
    };

    // Scope filter by role
    if (session.role === 'PUSKESMAS' && session.healthCenterId) {
      where.posyandu = { healthCenterId: session.healthCenterId };
    } else if (session.role === 'POSYANDU' && session.posyanduId) {
      where.posyanduId = session.posyanduId;
    }

    // Drill filter unit (dipakai detail per-indikator). Tetap menghormati scope peran.
    const unitId = searchParams.get('unitId');
    const unitLevel = searchParams.get('unitLevel');
    if (unitId && session.role !== 'POSYANDU') {
      if (unitLevel === 'puskesmas') {
        if (session.role === 'PUSKESMAS' && unitId !== session.healthCenterId) {
          return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
        }
        where.posyandu = { healthCenterId: unitId };
      } else {
        where.posyanduId = unitId;
      }
    }

    // Override with month filter if specified
    if (ym) {
      const [year, month] = ym.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
      where.sessionDate = { gte: monthStart, lte: monthEnd };
    }

    const rawRows = await prisma.measurement.findMany({
      where: where as never,
      include: {
        patient: { select: { name: true, regNumber: true, gender: true } },
        posyandu: {
          select: {
            name: true,
            healthCenterId: true,
            kalurahan: { select: { name: true } },
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
      take: 500,
    });

    const filteredIndicators = indicatorKey
      ? INDICATORS.filter((i) => i.key === indicatorKey)
      : INDICATORS;

    const results: {
      measurementId: string;
      patientName: string;
      regNumber: string;
      category: string | null;
      gender: string | null;
      indicatorKey: string;
      indicatorLabel: string;
      unit: string;
      value: number | string;
      posyanduId: string;
      posyanduName: string;
      kalurahan: string;
      ym: string;
      meta: string;
      note: string;
    }[] = [];

    for (const row of rawRows) {
      const ymVal = ymOf(row.sessionDate);
      const gender = row.patient.gender;
      const category = (row.category as PatientCategory) ?? null;

      // Hanya indikator yang berlaku untuk kategori pasien ini (F3: appliesTo).
      const applicable = category
        ? filteredIndicators.filter((ind) => ind.appliesTo.includes(category))
        : filteredIndicators;

      for (const ind of applicable) {
        const measurementData = {
          systolic: row.systolic,
          diastolic: row.diastolic,
          hemoglobin: row.hemoglobin,
          bloodSugar: row.bloodSugar,
          cholesterol: row.cholesterol,
          uricAcid: row.uricAcid,
          visionStatus: row.visionStatus,
          hearingStatus: row.hearingStatus,
          tbScreeningStatus: row.tbScreeningStatus,
        };

        if (checkIndicator(measurementData, ind, gender, category)) {
          let value: number | string = '-';
          if (ind.key === 'abnormalVision') value = String(row.visionStatus ?? '-');
          else if (ind.key === 'abnormalHearing') value = String(row.hearingStatus ?? '-');
          else if (ind.key === 'tbRisk') value = 'Beresiko';
          else if (ind.field) {
            const raw = (row as Record<string, unknown>)[ind.field];
            value = raw != null ? Number(raw) : '-';
          }

          results.push({
            measurementId: row.id,
            patientName: row.patient.name,
            regNumber: row.patient.regNumber,
            category: row.category,
            gender,
            indicatorKey: ind.key,
            indicatorLabel: ind.label,
            unit: ind.unit,
            value,
            posyanduId: row.posyanduId,
            posyanduName: row.posyandu.name,
            kalurahan: row.posyandu.kalurahan?.name ?? '',
            ym: ymVal,
            meta: `${row.posyandu.name} · ${row.posyandu.kalurahan?.name ?? ''}`,
            note: ind.label,
          });
        }
      }
    }

    // Pencarian nama/no. registrasi (opsional).
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();
    const filtered = q
      ? results.filter(
          (r) => r.patientName.toLowerCase().includes(q) || r.regNumber.toLowerCase().includes(q),
        )
      : results;

    // Pagination opsional: tanpa `page`, kembalikan semua (kompatibel pemakaian lama).
    const pageParam = searchParams.get('page');
    let data = filtered;
    const total = filtered.length;
    if (pageParam) {
      const page = Math.max(1, Number(pageParam) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 20) || 20));
      const start = (page - 1) * pageSize;
      data = filtered.slice(start, start + pageSize);
    }

    return NextResponse.json({ success: true, total, data });
  } catch (error) {
    console.error('Stats abnormal-patients error:', error);
    return NextResponse.json({ error: 'Gagal memuat data pasien abnormal' }, { status: 500 });
  }
}
