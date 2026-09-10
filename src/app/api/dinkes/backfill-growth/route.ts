/**
 * POST /api/dinkes/backfill-growth
 *
 * Hitung ulang status gizi (Permenkes 2/2020) untuk SEMUA pengukuran yang
 * sudah ada — mengganti kolom z*Status yang lama/kosong. Khusus DINKES.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { computeGrowth, type StaturePosition } from '@/lib/growth';
import { recomputePatientWeightProgression } from '@/lib/weight-progression-db';

const BATCH = 500;

export async function POST(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES']);
    if (session instanceof NextResponse) return session;

    let updated = 0;
    let skipped = 0;
    let cursor: string | undefined;

    for (;;) {
      const rows = await prisma.measurement.findMany({
        take: BATCH,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
        select: {
          id: true,
          weight: true,
          height: true,
          position: true,
          sessionDate: true,
          patient: { select: { gender: true, birthDate: true } },
        },
      });
      if (rows.length === 0) break;
      cursor = rows[rows.length - 1].id;

      for (const m of rows) {
        const g = computeGrowth({
          gender: m.patient.gender,
          birthDate: m.patient.birthDate,
          sessionDate: m.sessionDate,
          weight: m.weight,
          height: m.height,
          position: (m.position as StaturePosition | null) ?? undefined,
        });
        if (!g.ok) {
          skipped++;
          continue;
        }
        await prisma.measurement.update({
          where: { id: m.id },
          data: {
            position: g.position ?? m.position,
            zWeightAge: g.BB_U?.z ?? null,
            zHeightAge: g.TB_U?.z ?? null,
            zWeightHeight: g.BB_TB?.z ?? null,
            zBmiAge: g.IMT_U?.z ?? null,
            underweightStatus: g.BB_U?.categoryKey ?? null,
            stuntingStatus: g.TB_U?.categoryKey ?? null,
            wastingStatus: g.BB_TB?.categoryKey ?? null,
            growthRefVersion: g.refVersion,
          },
        });
        updated++;
      }

      if (rows.length < BATCH) break;
    }

    // Backfill progres berat (N/T & 2T) — harus per pasien, urut tanggal.
    let weightUpdated = 0;
    const patients = await prisma.patient.findMany({ select: { id: true } });
    for (const p of patients) {
      weightUpdated += await recomputePatientWeightProgression(p.id);
    }

    return NextResponse.json({ success: true, updated, skipped, weightUpdated });
  } catch (error) {
    console.error('Backfill growth error:', error);
    return NextResponse.json({ error: 'Gagal menghitung ulang status gizi' }, { status: 500 });
  }
}
