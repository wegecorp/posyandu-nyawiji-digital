// scripts/import-sqlite-to-postgres.mjs
// Impor hasil ekspor `sqlite3 -json` ke PostgreSQL. Jalankan:
//   node --env-file=.env scripts/import-sqlite-to-postgres.mjs /tmp/nyawiji-export
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const DIR = process.argv[2] || '/tmp/nyawiji-export';
const CHUNK = 500;

// Kolom yang harus dikonversi dari epoch-ms (SQLite) ke Date (PostgreSQL).
const DATE_FIELDS = {
  Kapanewon: ['createdAt', 'updatedAt'],
  Kalurahan: ['createdAt', 'updatedAt'],
  HealthCenter: ['createdAt', 'updatedAt'],
  Posyandu: ['createdAt', 'updatedAt'],
  User: ['createdAt', 'updatedAt', 'disabledAt'],
  Patient: ['birthDate', 'createdAt', 'updatedAt'],
  Measurement: ['sessionDate', 'createdAt', 'updatedAt'],
};
// Kolom Boolean (SQLite menyimpan 0/1).
const BOOL_FIELDS = {
  User: ['mustChangePassword'],
  Patient: ['isPregnant'],
  Measurement: ['weightFaltering2T', 'exclusiveBreastfeeding'],
};

// Urut sesuai ketergantungan FK. Dihapus terbalik saat membersihkan target.
const ORDER = ['Kapanewon', 'Kalurahan', 'HealthCenter', 'Posyandu', 'User', 'Patient', 'Measurement'];
const DELEGATE = {
  Kapanewon: () => prisma.kapanewon,
  Kalurahan: () => prisma.kalurahan,
  HealthCenter: () => prisma.healthCenter,
  Posyandu: () => prisma.posyandu,
  User: () => prisma.user,
  Patient: () => prisma.patient,
  Measurement: () => prisma.measurement,
};

function toDate(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return new Date(v);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error(`Tanggal tidak valid: ${JSON.stringify(v)}`);
  return d;
}

function toBool(v) {
  if (v === null || v === undefined) return null;
  return v === 1 || v === true || v === '1';
}

function transform(model, row) {
  const out = { ...row };
  for (const f of DATE_FIELDS[model] ?? []) {
    if (f in out) out[f] = toDate(out[f]);
  }
  for (const f of BOOL_FIELDS[model] ?? []) {
    if (f in out) out[f] = toBool(out[f]);
  }
  return out;
}

async function main() {
  console.log(`Sumber: ${DIR}`);

  // Bersihkan target (urutan terbalik) supaya impor idempoten.
  for (const model of [...ORDER].reverse()) {
    const n = await DELEGATE[model]().deleteMany();
    console.log(`  bersihkan ${model}: ${n.deleteMany ?? n.count ?? 0} baris`);
  }

  for (const model of ORDER) {
    const file = path.join(DIR, `${model}.json`);
    if (!fs.existsSync(file)) {
      console.log(`- ${model}: berkas tidak ada, dilewati`);
      continue;
    }
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const rows = raw.map((r) => transform(model, r));
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const res = await DELEGATE[model]().createMany({ data: slice, skipDuplicates: false });
      inserted += res.count;
    }
    console.log(`+ ${model}: ${inserted}/${raw.length} baris`);
  }
}

main()
  .catch((e) => {
    console.error('GAGAL:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
