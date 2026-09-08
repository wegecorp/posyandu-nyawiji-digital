/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

const DEFAULT_PASSWORD = process.env.POSYANDU_DEFAULT_PASSWORD || 'posyandu2026';

// Data uji lokal: 1 Puskesmas + beberapa Posyandu di Kapanewon Wonosari.
// Idempotent — aman dijalankan berulang.
async function main() {
  const pass = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  const wonosari = await prisma.kapanewon.upsert({
    where: { code: 'WNS' },
    update: {},
    create: { code: 'WNS', name: 'Wonosari' },
  });

  const kalurahan = await prisma.kalurahan.upsert({
    where: { code: 'WNS-BLH' },
    update: { name: 'Baleharjo' },
    create: { code: 'WNS-BLH', name: 'Baleharjo', kapanewonId: wonosari.id },
  });

  let hc = await prisma.healthCenter.findFirst({ where: { name: 'Puskesmas Wonosari I' } });
  if (!hc) {
    hc = await prisma.healthCenter.create({
      data: { code: 'PKM-WNS-01', name: 'Puskesmas Wonosari I', kapanewonId: wonosari.id },
    });
    await prisma.user.create({
      data: {
        username: 'pkm_wonosari1',
        password: pass,
        name: 'Puskesmas Wonosari I',
        role: 'PUSKESMAS',
        healthCenterId: hc.id,
        mustChangePassword: true,
      },
    });
    console.log('Puskesmas Wonosari I + akun staf dibuat (default password).');
  } else {
    console.log('Puskesmas Wonosari I sudah ada — dilewati.');
  }

  const samples = [
    { name: 'Posyandu Melati', padukuhan: 'Purbosari' },
    { name: 'Posyandu Dahlia', padukuhan: 'Kwarasan' },
    { name: 'Posyandu Mawar', padukuhan: 'Jati' },
  ];

  for (const s of samples) {
    const exists = await prisma.posyandu.findFirst({
      where: { healthCenterId: hc.id, name: s.name },
    });
    if (exists) {
      console.log(`Posyandu ${s.name} sudah ada — dilewati.`);
      continue;
    }
    const count = await prisma.posyandu.count({ where: { healthCenterId: hc.id } });
    const code = `POS-WNS-01-${String(count + 1).padStart(3, '0')}`;
    const posyandu = await prisma.posyandu.create({
      data: {
        code,
        name: s.name,
        padukuhan: s.padukuhan,
        kalurahanId: kalurahan.id,
        healthCenterId: hc.id,
      },
    });
    await prisma.user.create({
      data: {
        username: `posyandu-${code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        password: pass,
        name: s.name,
        role: 'POSYANDU',
        posyanduId: posyandu.id,
        mustChangePassword: true,
      },
    });
    console.log(`Posyandu ${s.name} (${code}) dibuat.`);
  }

  console.log('Selesai. Login kader: cascade Puskesmas Wonosari I > Baleharjo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
