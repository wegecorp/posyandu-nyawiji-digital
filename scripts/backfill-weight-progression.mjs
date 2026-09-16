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
  isKmsAge,
} from '../src/lib/growth/weight-progression.ts';

const prisma = new PrismaClient();

/** Umur bulan penuh (samakan `ageInCompletedMonths` di src/lib/growth). */
function ageInMonths(birthDate, sessionDate) {
  const b = new Date(birthDate);
  const s = new Date(sessionDate);
  let months = (s.getFullYear() - b.getFullYear()) * 12 + (s.getMonth() - b.getMonth());
  if (s.getDate() < b.getDate()) months--;
  return months < 0 ? 0 : months;
}

async function main() {
  const patients = await prisma.patient.findMany({ select: { id: true, birthDate: true } });
  let rows = 0;
  let flagged = 0;
  let cleared = 0;

  for (const p of patients) {
    const measurements = await prisma.measurement.findMany({
      where: { patientId: p.id },
      orderBy: { sessionDate: 'asc' },
      select: { id: true, weight: true, sessionDate: true, weightStatus: true },
    });

    let prevWeight = null;
    let prevStatus = null;
    const updates = [];
    for (const m of measurements) {
      // N/T & 2T hanya umur 0-60 bln (KMS) saat pengukuran.
      const eligible = isKmsAge(ageInMonths(p.birthDate, m.sessionDate));
      const prog = computeWeightProgression(prevWeight, m.weight, prevStatus, eligible);
      updates.push({ id: m.id, ...prog });
      if (prog.faltering2T) flagged++;
      if (!eligible && m.weightStatus != null) cleared++;
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
    `Backfill progres berat selesai: ${patients.length} pasien, ${rows} pengukuran, ` +
      `${flagged} penanda 2T, ${cleared} baris non-KMS dibersihkan.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
