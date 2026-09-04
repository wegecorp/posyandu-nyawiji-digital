const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.measurement.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.posyandu.deleteMany();
  await prisma.healthCenter.deleteMany();
  console.log('Database 100% bersih! Semua akun, posyandu, puskesmas, pasien, dan pengukuran telah dihapus.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
