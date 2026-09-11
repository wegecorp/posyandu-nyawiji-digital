/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Migrasi / seed data Gunungkidul dari CSV daftar posyandu.
 *
 * 1 file CSV (kolom: NAMA PUSKESMAS, NAMA KALURAHAN, NAMA PADUKUHAN, NAMA POSYANDU)
 * menghasilkan:
 *   - Kapanewon (harus sudah di-seed via `prisma db seed`)
 *   - Puskesmas + akun staf PUSKESMAS  (nama puskesmas -> kapanewon diturunkan otomatis)
 *   - Kalurahan referensi
 *   - Posyandu + akun POSYANDU (password default, wajib aktivasi)
 *
 * Idempotent: aman dijalankan ulang (tidak menduplikasi). Cocok utk lokal & VPS.
 *
 * Jalankan:  node scripts/data-gunungkidul.js [path-csv]
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function defaultPasswordFromEnv(envKey) {
  const value = process.env[envKey];
  if (value && value.trim()) return value;
  console.warn(
    `[security] ${envKey} tidak diset — memakai password acak. Set di .env sebelum membuat akun.`
  );
  return crypto.randomBytes(24).toString('hex');
}

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

function norm(s) {
  return String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const ROMAN_VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

/** Konversi angka romawi (I..XXXIX) -> angka arab. null bila bukan romawi. */
function romanToNumber(token) {
  const u = String(token).toUpperCase();
  if (!/^[IVXLCDM]+$/.test(u)) return null;
  let total = 0;
  let prev = 0;
  for (let i = u.length - 1; i >= 0; i--) {
    const v = ROMAN_VALUES[u[i]];
    if (v < prev) total -= v;
    else {
      total += v;
      prev = v;
    }
  }
  return total >= 1 && total <= 39 ? total : null;
}

/**
 * Title-case yang aman utk angka romawi.
 * 'PUSKESMAS WONOSARI II' -> 'Puskesmas Wonosari II' (bukan '... Ii').
 */
function smartTitle(s) {
  return String(s)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (romanToNumber(w) !== null ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * Basis username staf puskesmas dari nama (tanpa prefix 'pkm_').
 * 'Puskesmas Wonosari I' -> 'wonosari1' ; 'Puskesmas Semanu II' -> 'semanu2'
 */
function pkmUsernameBase(name) {
  const words = String(name)
    .replace(/\bpuskesmas\b/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const tail = [...words];
  let seq = 1;
  const last = tail[tail.length - 1];
  if (last !== undefined) {
    const n = romanToNumber(last);
    if (n !== null) {
      seq = n;
      tail.pop();
    }
  }
  const core = tail.join('').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${core}${seq}`;
}

/** Ekstrak suffix I/II/III -> 1/2/3. 'NGLIPAR I' => 1, 'RONGKOP' => 1 */
function pkmSeq(name) {
  const m = String(name).trim().match(/(I{1,3})$/i);
  if (!m) return 1;
  return m[1].length;
}

function parseCsv(buffer) {
  const lines = buffer.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  let headerIdx = -1;
  let colP = -1, colK = -1, colPa = -1, colPo = -1;
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim());
    const find = (t) => cells.findIndex((c) => c.toUpperCase().includes(t));
    const p = find('PUSKESMAS');
    const po = find('POSYANDU');
    if (p >= 0 && po >= 0) {
      headerIdx = i;
      colP = p; colK = find('KALURAHAN'); colPa = find('PADUKUHAN'); colPo = po;
      break;
    }
  }
  if (headerIdx < 0) throw new Error('Header tidak ditemukan (butuh kolom NAMA PUSKESMAS & NAMA POSYANDU).');
  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim());
    const puskesmas = cells[colP] || '';
    const kalurahan = cells[colK] || '';
    const padukuhan = colPa >= 0 ? cells[colPa] || '' : '';
    const posyandu = cells[colPo] || '';
    if (!puskesmas || !kalurahan || !posyandu) continue;
    rows.push({ rowNo: i + 1, puskesmas, kalurahan, padukuhan, posyandu });
  }
  return rows;
}

async function main() {
  const csvPath = process.argv[2] || path.join(process.cwd(), 'daftarposyandu.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`File tidak ditemukan: ${csvPath}`);
    process.exit(1);
  }
  const rows = parseCsv(fs.readFileSync(csvPath));
  console.log(`Baris terbaca: ${rows.length}`);

  const posyanduPass = await bcrypt.hash(
    defaultPasswordFromEnv('POSYANDU_DEFAULT_PASSWORD'),
    SALT_ROUNDS
  );
  const puskesmasPass = await bcrypt.hash(
    defaultPasswordFromEnv('PUSKESMAS_DEFAULT_PASSWORD'),
    SALT_ROUNDS
  );

  const kapanewonAll = await prisma.kapanewon.findMany();
  if (kapanewonAll.length === 0) {
    console.error('Kapanewon kosong. Jalankan dulu: npx prisma db seed');
    process.exit(1);
  }
  const knByNorm = new Map(kapanewonAll.map((k) => [norm(k.name), k]));

  // Derive kapanewon dari nama puskesmas (prefix terpanjang).
  function deriveKapanewon(pkmName) {
    const target = normNoPuskesma(pkmName);
    let best = null;
    let bestLen = -1;
    for (const [n, k] of knByNorm) {
      if (target === n || target.startsWith(n)) {
        if (n.length > bestLen) {
          bestLen = n.length;
          best = k;
        }
      }
    }
    return best;
  }

  function normNoPuskesma(s) {
    return String(s).toUpperCase().replace(/PUSKESMAS/g, '').replace(/[^A-Z0-9]/g, '');
  }

  const report = {
    rows: rows.length,
    puskesmasCreated: 0,
    puskesmasExisting: 0,
    puskesmasUnknown: 0,
    staffCreated: 0,
    kalurahanCreated: 0,
    posyanduCreated: 0,
    posyanduSkipped: 0,
    errors: [],
  };

  // Preload utk idempotensi
  const hcs = await prisma.healthCenter.findMany({ include: { kapanewon: true } });
  const hcByNormName = new Map(hcs.map((h) => [normNoPuskesma(h.name), h]));
  const kalurahanByKey = new Map(
    (await prisma.kalurahan.findMany()).map((k) => [`${k.kapanewonId}:${norm(k.name)}`, k])
  );
  const posyanduByKey = new Map(
    (await prisma.posyandu.findMany({ include: { kalurahan: true } })).map((p) => [
      `${p.healthCenterId}:${p.kalurahanId}:${norm(p.name)}:${norm(p.padukuhan || '')}`,
      p,
    ])
  );
  const kalSeq = new Map();
  for (const k of kalurahanByKey.values()) {
    const n = Number(k.code.split('-').pop()) || 0;
    if (n > (kalSeq.get(k.kapanewonId) || 0)) kalSeq.set(k.kapanewonId, n);
  }
  const seqHc = new Map();
  for (const h of hcs) {
    const m = h.code.match(/-(\d+)$/);
    const cur = Number(m ? m[1] : 0);
    if (cur > (seqHc.get(h.kapanewonId) || 0)) seqHc.set(h.kapanewonId, cur);
  }

  const nextKalCode = (kapanewonId, kapanewonCode) => {
    const n = (kalSeq.get(kapanewonId) || 0) + 1;
    kalSeq.set(kapanewonId, n);
    return `${kapanewonCode}-${String(n).padStart(3, '0')}`;
  };
  const nextPkmCode = (kapanewonId, kapanewonCode) => {
    const n = (seqHc.get(kapanewonId) || 0) + 1;
    seqHc.set(kapanewonId, n);
    return `PKM-${kapanewonCode}-${String(n).padStart(2, '0')}`;
  };

  const hcCodeSeq = new Map(); // utk code posyandu per HC

  for (const row of rows) {
    const kn = deriveKapanewon(row.puskesmas);
    if (!kn) {
      report.puskesmasUnknown++;
      if (report.errors.length < 50) report.errors.push({ rowNo: row.rowNo, message: `Kapanewon tidak dikenali utk "${row.puskesmas}"` });
      continue;
    }

    const normPkm = normNoPuskesma(row.puskesmas);
    let hc = hcByNormName.get(normPkm);

    if (!hc) {
      const seq = pkmSeq(row.puskesmas);
      const knSeq = seqHc.get(kn.id) || 0;
      const code = knSeq >= seq ? nextPkmCode(kn.id, kn.code) : `PKM-${kn.code}-${String(seq).padStart(2, '0')}`;
      // pastikan kode unik walau seq kecil
      hc = await prisma.healthCenter.create({
        data: { code, name: smartTitle(row.puskesmas), kapanewonId: kn.id },
      });
      seqHc.set(kn.id, Math.max(seqHc.get(kn.id) || 0, seq));
      hcByNormName.set(normPkm, hc);
      report.puskesmasCreated++;

      // Akun staf PUSKESMAS — username otomatis dari nama (mudah diingat).
      const uname = `pkm_${pkmUsernameBase(hc.name)}`;
      const existsUser = await prisma.user.findFirst({ where: { username: uname } });
      if (!existsUser) {
        await prisma.user.create({
          data: {
            username: uname,
            password: puskesmasPass,
            name: hc.name,
            role: 'PUSKESMAS',
            healthCenterId: hc.id,
            mustChangePassword: true,
          },
        });
        report.staffCreated++;
      }
    } else {
      report.puskesmasExisting++;
    }

    // Kalurahan
    const kKey = `${kn.id}:${norm(row.kalurahan)}`;
    let kalurahan = kalurahanByKey.get(kKey);
    if (!kalurahan) {
      kalurahan = await prisma.kalurahan.create({
        data: {
          code: nextKalCode(kn.id, kn.code),
          name: smartTitle(row.kalurahan),
          kapanewonId: kn.id,
        },
      });
      kalurahanByKey.set(kKey, kalurahan);
      report.kalurahanCreated++;
    }

    // Posyandu
    const pKey = `${hc.id}:${kalurahan.id}:${norm(row.posyandu)}:${norm(row.padukuhan || '')}`;
    if (posyanduByKey.has(pKey)) {
      report.posyanduSkipped++;
      continue;
    }

    const n = (hcCodeSeq.get(hc.id) || (await prisma.posyandu.count({ where: { healthCenterId: hc.id } }))) + 1;
    hcCodeSeq.set(hc.id, n);
    const hcPart = hc.code.replace(/^PKM-/i, '');
    const code = `POS-${hcPart.toUpperCase()}-${String(n).padStart(3, '0')}`;
    const name = smartTitle(row.posyandu);
    const padukuhan = smartTitle(row.padukuhan || '-');

    try {
      const posyandu = await prisma.posyandu.create({
        data: { code, name, kalurahanId: kalurahan.id, padukuhan, healthCenterId: hc.id },
      });
      await prisma.user.create({
        data: {
          username: `posyandu-${code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          password: posyanduPass,
          name,
          role: 'POSYANDU',
          posyanduId: posyandu.id,
          mustChangePassword: true,
        },
      });
      posyanduByKey.set(pKey, posyandu);
      report.posyanduCreated++;
    } catch (e) {
      if (report.errors.length < 50) report.errors.push({ rowNo: row.rowNo, message: e.message });
    }
  }

  console.log('\n=== RINGKASAN SEED GUNUNGKIDUL ===');
  console.log(`Puskesmas dibuat      : ${report.puskesmasCreated}`);
  console.log(`Puskesmas sudah ada   : ${report.puskesmasExisting}`);
  console.log(`Akun staf dibuat      : ${report.staffCreated}`);
  console.log(`Kalurahan dibuat      : ${report.kalurahanCreated}`);
  console.log(`Posyandu dibuat       : ${report.posyanduCreated}`);
  console.log(`Posyandu duplikat     : ${report.posyanduSkipped}`);
  console.log(`Puskesmas tak dikenal : ${report.puskesmasUnknown}`);
  if (report.errors.length) {
    console.log(`\nError (${report.errors.length}):`);
    report.errors.slice(0, 20).forEach((e) => console.log(`  baris ${e.rowNo}: ${e.message}`));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
