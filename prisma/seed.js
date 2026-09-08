/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

// Referensi Kapanewon (wilayah) Kabupaten Gunungkidul — 18 kapanewon.
// Kalurahan & Posyandu diisi lewat import DINKES / dev-data, bukan di sini.
const KAPANEWON = [
  { code: 'WNS', name: 'Wonosari' },
  { code: 'SMN', name: 'Semin' },
  { code: 'KMJ', name: 'Karangmojo' },
  { code: 'PNJ', name: 'Ponjong' },
  { code: 'PLY', name: 'Playen' },
  { code: 'PTK', name: 'Patuk' },
  { code: 'GDS', name: 'Gedangsari' },
  { code: 'NGL', name: 'Nglipar' },
  { code: 'NGW', name: 'Ngawen' },
  { code: 'PGG', name: 'Panggang' },
  { code: 'PWS', name: 'Purwosari' },
  { code: 'PYA', name: 'Paliyan' },
  { code: 'SPS', name: 'Saptosari' },
  { code: 'TPS', name: 'Tepus' },
  { code: 'TJS', name: 'Tanjungsari' },
  { code: 'RKP', name: 'Rongkop' },
  { code: 'GSB', name: 'Girisubo' },
  { code: 'SMU', name: 'Semanu' },
];

async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

async function main() {
  // 1. Seed referensi Kapanewon (upsert by code, tidak menghapus data).
  for (const kn of KAPANEWON) {
    await prisma.kapanewon.upsert({
      where: { code: kn.code },
      update: { name: kn.name },
      create: { code: kn.code, name: kn.name },
    });
  }
  console.log(`Seeding ${KAPANEWON.length} Kapanewon... done`);

  // 2. Seed DINKES super-admin (akun pemilik aplikasi, langsung aktif).
  const dinkesUsername = (process.env.DINKES_ADMIN_USERNAME || 'dinkes_gk').toLowerCase().trim();
  const dinkesPassword = process.env.DINKES_ADMIN_PASSWORD || 'adminposyandu123';

  const existing = await prisma.user.findUnique({ where: { username: dinkesUsername } });

  if (existing) {
    // JANGAN timpa password akun yang sudah pernah diaktivasi/ganti.
    console.log(`DINKES account '${dinkesUsername}' already exists — skipped (password preserved).`);
  } else {
    const hashed = await hashPassword(dinkesPassword);
    await prisma.user.create({
      data: {
        username: dinkesUsername,
        password: hashed,
        name: 'Dinas Kesehatan Kabupaten Gunungkidul',
        role: 'DINKES',
        mustChangePassword: false,
      },
    });
    console.log(`DINKES super-admin '${dinkesUsername}' created.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
