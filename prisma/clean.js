/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.measurement.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.posyandu.deleteMany();
  await prisma.healthCenter.deleteMany();
  await prisma.kalurahan.deleteMany();
  await prisma.kapanewon.deleteMany();
  console.log('Database 100% bersih! Semua data referensi & operasional telah dihapus.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
