/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

const crypto = require('crypto');

function defaultPasswordFromEnv(envKey) {
  const value = process.env[envKey];
  if (value && value.trim()) return value;
  console.warn(
    `[security] ${envKey} tidak diset — memakai password acak. Set di .env sebelum membuat akun.`
  );
  return crypto.randomBytes(24).toString('hex');
}

const POSYANDU_PASS = defaultPasswordFromEnv('POSYANDU_DEFAULT_PASSWORD');
const PUSKESMAS_PASS = defaultPasswordFromEnv('PUSKESMAS_DEFAULT_PASSWORD');

// Data uji lokal: 1 Puskesmas + beberapa Posyandu di Kapanewon Wonosari.
// Idempotent — aman dijalankan berulang.
async function main() {
  const posyanduPass = await bcrypt.hash(POSYANDU_PASS, SALT_ROUNDS);
  const puskesmasPass = await bcrypt.hash(PUSKESMAS_PASS, SALT_ROUNDS);

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
        password: puskesmasPass,
        name: 'Puskesmas Wonosari I',
        role: 'PUSKESMAS',
        healthCenterId: hc.id,
        mustChangePassword: true,
      },
    });
    console.log('Puskesmas Wonosari I + akun staf dibuat (password default puskesmas).');
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
        password: posyanduPass,
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
