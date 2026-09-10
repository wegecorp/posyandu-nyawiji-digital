/**
 * Orkestrasi DB untuk progres berat (N/T & 2T).
 *
 * Rantai N/T bersifat sekuensial per pasien: mengubah satu pengukuran lama
 * mengubah status pengukuran setelahnya. Karena itu fungsi di sini selalu
 * menghitung ulang SELURUH riwayat pasien urut tanggal (idempoten).
 */

import { prisma } from './prisma';
import { computeWeightProgression } from './growth/weight-progression';

/**
 * Hitung ulang weightGain / weightStatus / weightFaltering2T untuk semua
 * pengukuran pasien, urut `sessionDate` menaik.
 */
export async function recomputePatientWeightProgression(patientId: string): Promise<number> {
  const rows = await prisma.measurement.findMany({
    where: { patientId },
    orderBy: { sessionDate: 'asc' },
    select: { id: true, weight: true },
  });

  let prevWeight: number | null = null;
  let prevStatus: string | null = null;
  const updates: Array<{ id: string; gain: number | null; status: string | null; faltering2T: boolean }> = [];

  for (const m of rows) {
    const prog = computeWeightProgression(prevWeight, m.weight, prevStatus);
    updates.push({ id: m.id, gain: prog.gain, status: prog.status, faltering2T: prog.faltering2T });
    if (m.weight != null) {
      prevWeight = m.weight;
      prevStatus = prog.status;
    }
  }

  if (updates.length === 0) return 0;

  await prisma.$transaction(
    updates.map((u) =>
      prisma.measurement.update({
        where: { id: u.id },
        data: {
          weightGain: u.gain,
          weightStatus: u.status,
          weightFaltering2T: u.faltering2T,
        },
      }),
    ),
  );

  return updates.length;
}
