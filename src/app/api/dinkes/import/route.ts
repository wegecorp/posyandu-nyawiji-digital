import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { hashPassword } from '@/lib/password';
import * as XLSX from 'xlsx';
import { smartTitle, deriveKapanewon, normPuskesmasName } from '@/lib/names';
import {
  generatePosyanduCode,
  generateHealthCenterCode,
  generateUniquePuskesmasUsername,
  buildPosyanduUsername,
  getPosyanduDefaultPassword,
  getPuskesmasDefaultPassword,
} from '@/lib/accounts';

interface ImportRow {
  rowNo: number;
  puskesmas: string;
  kalurahan: string;
  padukuhan: string;
  posyandu: string;
}

interface Report {
  rowsTotal: number;
  puskesmasCreated: number;
  puskesmasUnknown: number;
  kalurahanCreated: number;
  posyanduCreated: number;
  posyanduSkipped: number;
  errors: { rowNo: number; message: string }[];
}

function norm(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function parseRows(buffer: Buffer): { rows: ImportRow[]; error: string | null } {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    return { rows: [], error: 'File tidak bisa dibaca. Pastikan file .xlsx / .csv valid.' };
  }
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return { rows: [], error: 'File tidak memiliki sheet.' };
  const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[firstSheet], { header: 1, defval: '' });

  // Cari baris header: mengandung NAMA PUSKESMAS & NAMA POSYANDU
  let headerIdx = -1;
  let colPuskesmas = -1;
  let colKalurahan = -1;
  let colPadukuhan = -1;
  let colPosyandu = -1;

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i].map((c) => String(c).trim());
    const idx = (token: string) => row.findIndex((c) => c.toUpperCase().includes(token));
    const p = idx('PUSKESMAS');
    const k = idx('KALURAHAN');
    const pa = idx('PADUKUHAN');
    const po = idx('POSYANDU');
    if (p >= 0 && po >= 0) {
      headerIdx = i;
      colPuskesmas = p;
      colKalurahan = k;
      colPadukuhan = pa;
      colPosyandu = po;
      break;
    }
  }

  if (headerIdx < 0) {
    return { rows: [], error: 'Kolom header tidak ditemukan. Butuh: NAMA PUSKESMAS, NAMA KALURAHAN, NAMA PADUKUHAN, NAMA POSYANDU.' };
  }

  const rows: ImportRow[] = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const cells = raw[i].map((c) => String(c).trim());
    const puskesmas = cells[colPuskesmas] || '';
    const kalurahan = cells[colKalurahan] || '';
    const padukuhan = colPadukuhan >= 0 ? cells[colPadukuhan] || '' : '';
    const posyandu = cells[colPosyandu] || '';
    if (!puskesmas || !kalurahan) continue; // baris kosong / judul / tanpa wilayah
    rows.push({ rowNo: i + 1, puskesmas, kalurahan, padukuhan, posyandu });
  }

  return { rows, error: null };
}

interface KalRef {
  id: string;
  code: string;
  name: string;
  kapanewonId: string;
}

async function runImport(rows: ImportRow[], dryRun: boolean): Promise<Report> {
  const report: Report = {
    rowsTotal: rows.length,
    puskesmasCreated: 0,
    puskesmasUnknown: 0,
    kalurahanCreated: 0,
    posyanduCreated: 0,
    posyanduSkipped: 0,
    errors: [],
  };

  // Referensi kapanewon (untuk menyimpulkan wilayah dari nama Puskesmas).
  const kapanewonAll = await prisma.kapanewon.findMany();
  if (kapanewonAll.length === 0) {
    report.errors.push({ rowNo: 0, message: 'Referensi Kapanewon kosong. Jalankan seed wilayah lebih dulu.' });
    return report;
  }

  // Preload semua HealthCenter beserta kapanewon-nya utk pencocokan nama.
  const hcs = await prisma.healthCenter.findMany({ include: { kapanewon: true } });
  const hcByNorm = new Map<string, (typeof hcs)[number]>();
  for (const hc of hcs) hcByNorm.set(normPuskesmasName(hc.name), hc);

  // Preload kalurahan yang sudah ada utk menghindari duplikasi.
  const existingKalurahan = await prisma.kalurahan.findMany();
  const kalurahanKey = (kapanewonId: string, name: string) => `${kapanewonId}:${norm(name)}`;
  const kalurahanByKey = new Map<string, KalRef>(existingKalurahan.map((k) => [kalurahanKey(k.kapanewonId, k.name), k]));

  // Preload posyandu (dgn kalurahan) utk idempotensi per HC.
  const existingPosyandus = await prisma.posyandu.findMany({ include: { kalurahan: true } });
  const posyanduByKey = new Map(
    existingPosyandus.map((p) => [
      `${p.healthCenterId}:${p.kalurahanId}:${norm(p.name)}:${norm(p.padukuhan || '')}`,
      p,
    ])
  );

  // Kalurahan code sequence per kapanewon
  const seqByKapanewon = new Map<string, number>();
  for (const k of existingKalurahan) {
    const s = seqByKapanewon.get(k.kapanewonId) || 0;
    if (Number(k.code.split('-').pop()) > s) seqByKapanewon.set(k.kapanewonId, Number(k.code.split('-').pop()));
  }
  const nextKalCode = (kapanewonCode: string, kapanewonId: string): string => {
    const n = (seqByKapanewon.get(kapanewonId) || 0) + 1;
    seqByKapanewon.set(kapanewonId, n);
    return `${kapanewonCode}-${String(n).padStart(3, '0')}`;
  };

  const defaultPassword = getPosyanduDefaultPassword();
  const defaultHash = await hashPassword(defaultPassword);
  const puskesmasHash = await hashPassword(getPuskesmasDefaultPassword());

  for (const row of rows) {
    let hc = hcByNorm.get(normPuskesmasName(row.puskesmas));

    // Puskesmas belum ada → simpulkan kapanewon dari nama, lalu buat + akun staf.
    if (!hc) {
      const kn = deriveKapanewon(row.puskesmas, kapanewonAll);
      if (!kn) {
        report.puskesmasUnknown++;
        report.errors.push({
          rowNo: row.rowNo,
          message: `Kapanewon tidak dikenali untuk Puskesmas "${row.puskesmas}". Periksa nama Puskesmas.`,
        });
        continue;
      }

      const cleanName = smartTitle(row.puskesmas);
      const code = await generateHealthCenterCode(kn.code);
      const username = await generateUniquePuskesmasUsername(cleanName);

      if (dryRun) {
        hc = {
          id: `hc-${code}`,
          code,
          name: cleanName,
          kapanewonId: kn.id,
          kapanewon: kn,
        } as unknown as (typeof hcs)[number];
      } else {
        hc = await prisma.$transaction(async (tx) => {
          const created = await tx.healthCenter.create({
            data: { code, name: cleanName, kapanewonId: kn.id },
            include: { kapanewon: true },
          });
          await tx.user.create({
            data: {
              username,
              password: puskesmasHash,
              name: cleanName,
              role: 'PUSKESMAS',
              healthCenterId: created.id,
              mustChangePassword: true,
            },
          });
          return created;
        });
      }
      hcByNorm.set(normPuskesmasName(hc.name), hc);
      report.puskesmasCreated++;
    }

    // Kalurahan (referensi) upsert
    const kapanewonId = hc.kapanewonId;
    const kKey = kalurahanKey(kapanewonId, row.kalurahan);
    let kalurahan: KalRef | undefined = kalurahanByKey.get(kKey);
    if (!kalurahan) {
      kalurahan = {
        id: `k-${kKey}`, // pseudo utk dry-run
        code: nextKalCode(hc.kapanewon.code, kapanewonId),
        name: smartTitle(row.kalurahan),
        kapanewonId,
      };
      if (!dryRun) {
        const created = await prisma.kalurahan.create({
          data: { code: kalurahan.code, name: kalurahan.name, kapanewonId },
        });
        kalurahan = created;
      }
      kalurahanByKey.set(kKey, kalurahan);
      report.kalurahanCreated++;
    }

    // Baris tanpa nama Posyandu = hanya menambah Kalurahan (referensi wilayah).
    if (!row.posyandu) continue;

    // Idempotensi posyandu: sama HC + kalurahan + nama + padukuhan
    const pKey = `${hc.id}:${kalurahan.id}:${norm(row.posyandu)}:${norm(row.padukuhan || '')}`;
    if (posyanduByKey.has(pKey)) {
      report.posyanduSkipped++;
      continue;
    }

    const code = await generatePosyanduCode(hc.code);
    const name = smartTitle(row.posyandu);
    const padukuhan = smartTitle(row.padukuhan || '-');
    const username = buildPosyanduUsername(code);

    if (dryRun) {
      posyanduByKey.set(pKey, { id: `p-${pKey}` } as never);
      report.posyanduCreated++;
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const posyandu = await tx.posyandu.create({
          data: {
            code,
            name,
            kalurahanId: kalurahan.id,
            padukuhan,
            healthCenterId: hc.id,
          },
        });
        await tx.user.create({
          data: {
            username,
            password: defaultHash,
            name,
            role: 'POSYANDU',
            posyanduId: posyandu.id,
            mustChangePassword: true,
          },
        });
      });
    } catch (e) {
      report.errors.push({ rowNo: row.rowNo, message: `Gagal membuat posyandu: ${(e as Error).message}` });
      continue;
    }
    posyanduByKey.set(pKey, { id: `p-${pKey}` } as never);
    report.posyanduCreated++;
  }

  return report;
}

// POST /api/dinkes/import (multipart: file)
// ?dry=1 untuk analisis tanpa menulis ke database.
export async function POST(req: Request) {
  try {
    const session = await requireRole(req, ['DINKES']);
    if (session instanceof NextResponse) return session;

    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dry') === '1';

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File wajib diunggah.' }, { status: 400 });
    }

    // Batas pertahanan sebelum mem-parse (pustaka xlsx npm punya celah
    // prototype-pollution/ReDoS; endpoint ini khusus DINKES).
    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Ukuran file harus antara 1 byte dan 5 MB.' }, { status: 400 });
    }
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      return NextResponse.json({ error: 'Format file harus .xlsx, .xls, atau .csv.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows, error } = parseRows(buffer);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const report = await runImport(rows, dryRun);
    return NextResponse.json({ success: true, dryRun, report });
  } catch (e) {
    console.error('Import error:', e);
    return NextResponse.json({ error: 'Gagal memproses import.' }, { status: 500 });
  }
}
