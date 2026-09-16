/**
 * Verifikasi cakupan N/T & 2T (ADR-0004) — READ-ONLY.
 *
 * Memastikan tidak ada pengukuran non-KMS (umur > 60 bln) yang masih
 * menyimpan `weightStatus`/`weightFaltering2T`. Jalankan SETELAH backfill.
 *
 *   node --env-file=.env scripts/verify-weight-progression.mjs
 *
 * Exit code 0 = bersih, 1 = masih ada sisa (perlu backfill).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Umur bulan penuh (samakan `ageInCompletedMonths` di src/lib/growth). */
function ageInMonths(birthDate, sessionDate) {
  const b = new Date(birthDate);
  const s = new Date(sessionDate);
  let months = (s.getFullYear() - b.getFullYear()) * 12 + (s.getMonth() - b.getMonth());
  if (s.getDate() < b.getDate()) months--;
  return months < 0 ? 0 : months;
}

const rows = await prisma.measurement.findMany({
  where: { OR: [{ weightStatus: { not: null } }, { weightFaltering2T: true }] },
  select: {
    id: true,
    weightStatus: true,
    weightFaltering2T: true,
    sessionDate: true,
    patient: { select: { birthDate: true } },
  },
});

const leftover = rows.filter((r) => ageInMonths(r.patient.birthDate, r.sessionDate) > 60);

console.log(`Baris KMS (umur 0-60 bln) ber-status/2T : ${rows.length - leftover.length}`);
console.log(`Baris non-KMS masih ber-status/2T       : ${leftover.length} (harus 0)`);
if (leftover.length > 0) {
  console.log('Contoh 10 baris sisa:');
  console.table(leftover.slice(0, 10).map((r) => ({ id: r.id, weightStatus: r.weightStatus, f2T: r.weightFaltering2T })));
}

await prisma.$disconnect();
process.exit(leftover.length === 0 ? 0 : 1);
