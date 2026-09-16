/**
 * Backfill kolom progres berat (N/T & 2T) untuk SELURUH riwayat.
 *
 * Idempoten. Memakai logika yang sama dengan aplikasi
 * (`src/lib/growth/weight-progression.ts`) agar tidak ada duplikasi aturan.
 *
 * Jalankan: `npm run db:backfill`
 */
import { PrismaClient } from '@prisma/client';
import {
  computeWeightProgression,
  supportsWeightFaltering,
} from '../src/lib/growth/weight-progression.ts';

const prisma = new PrismaClient();

async function main() {
  const patients = await prisma.patient.findMany({ select: { id: true } });
  let rows = 0;
  let flagged = 0;

  for (const p of patients) {
    const measurements = await prisma.measurement.findMany({
      where: { patientId: p.id },
      orderBy: { sessionDate: 'asc' },
      select: { id: true, weight: true, category: true },
    });

    let prevWeight = null;
    let prevStatus = null;
    const updates = [];
    for (const m of measurements) {
      // 2T hanya Bayi & Balita/Apras (snapshot kategori pengukuran).
      const eligible = supportsWeightFaltering(m.category);
      const prog = computeWeightProgression(prevWeight, m.weight, prevStatus, eligible);
      updates.push({ id: m.id, ...prog });
      if (prog.faltering2T) flagged++;
      if (m.weight != null) {
        prevWeight = m.weight;
        prevStatus = prog.status;
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.measurement.update({
            where: { id: u.id },
            data: { weightGain: u.gain, weightStatus: u.status, weightFaltering2T: u.faltering2T },
          }),
        ),
      );
      rows += updates.length;
    }
  }

  console.log(
    `Backfill progres berat selesai: ${patients.length} pasien, ${rows} pengukuran, ${flagged} penanda 2T.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
