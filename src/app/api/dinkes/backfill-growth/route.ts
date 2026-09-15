/**
 * POST /api/dinkes/backfill-growth
 *
 * Hitung ulang status gizi (Permenkes 2/2020) untuk SEMUA pengukuran yang
 * sudah ada — mengganti kolom z*Status yang lama/kosong. Khusus DINKES.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { requireRole } from '@/lib/api-auth';
import { computeGrowth, type StaturePosition } from '@/lib/growth';
import { getPatientCategory } from '@/lib/utils';
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
          patient: { select: { gender: true, birthDate: true, isPregnant: true } },
        },
      });
      if (rows.length === 0) break;
      cursor = rows[rows.length - 1].id;

      for (const m of rows) {
        const category = getPatientCategory(
          m.patient.birthDate,
          m.patient.isPregnant,
          m.patient.gender,
          m.sessionDate,
        );
        const g = computeGrowth({
          gender: m.patient.gender,
          birthDate: m.patient.birthDate,
          sessionDate: m.sessionDate,
          weight: m.weight,
          height: m.height,
          position: (m.position as StaturePosition | null) ?? undefined,
        });

        // Kategori umur selalu dihitung ulang; status gizi hanya bila 0-60 bln.
        const data: Prisma.MeasurementUpdateInput = { category };
        if (g.ok) {
          data.position = g.position ?? m.position;
          data.zWeightAge = g.BB_U?.z ?? null;
          data.zHeightAge = g.TB_U?.z ?? null;
          data.zWeightHeight = g.BB_TB?.z ?? null;
          data.zBmiAge = g.IMT_U?.z ?? null;
          data.underweightStatus = g.BB_U?.categoryKey ?? null;
          data.stuntingStatus = g.TB_U?.categoryKey ?? null;
          data.wastingStatus = g.BB_TB?.categoryKey ?? null;
          data.growthRefVersion = g.refVersion;
        }
        await prisma.measurement.update({ where: { id: m.id }, data });
        if (g.ok) updated++;
        else skipped++;
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
