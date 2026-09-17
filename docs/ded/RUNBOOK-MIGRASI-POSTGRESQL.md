# RUNBOOK — Migrasi SQLite ke PostgreSQL

Panduan operasional memindahkan Portal Nyawiji dari SQLite (berkas tunggal
`prisma/dev.db`) ke PostgreSQL, **tanpa kehilangan data**.

Ditujukan untuk: developer/operator Dinas Kesehatan Kabupaten Gunungkidul.

> **Peringatan.** Beberapa langkah bersifat merusak (menimpa database, menghapus
> `.next`). Kerjakan pada **jendela pemeliharaan** dan pastikan backup terbaru
> sudah ada sebelum mulai.

Asumsi jalur: repo `/opt/nyawiji`, PM2 `posyandu-nyawiji`, app `127.0.0.1:3001`.

---

## 0. Prasyarat & pembekuan data

1. Cabang kode `feat/migrasi-postgresql` sudah di-merge ke `main` (berisi perubahan
   provider Prisma, query `analytics.ts`, skrip backup/restore, dan tes integrasi).
2. PostgreSQL 16 + `postgresql-client` terpasang di server.
3. Timezone server **Asia/Jakarta** (WAJIB):
   ```bash
   sudo timedatectl set-timezone Asia/Jakarta
   timedatectl | grep 'Time zone'
   ```
4. `sqlite3` masih terpasang (dipakai untuk mengekspor data lama).
5. Tutup akses publik agar tidak ada data baru:
   ```bash
   sudo touch /var/www/maintenance.on
   ```
   Prosedur halaman pemeliharaan: `DEPLOY-UPDATE.md §4`.

### 0.1 Ambil backup SQLite (cara aman, bukan copy berkas)

SQLite berjalan mode WAL — menyalin `dev.db` mentah saat app hidup bisa menghasilkan
basis data basi/rusak.

```bash
cd /opt/nyawiji
pm2 stop posyandu-nyawiji
STAMP="$(date +%F-%H%M)"
sqlite3 prisma/dev.db ".backup '/tmp/nyawiji-$STAMP.db'"
sqlite3 "/tmp/nyawiji-$STAMP.db" 'PRAGMA integrity_check;'   # harus: ok
ls -lh "/tmp/nyawiji-$STAMP.db"
```
Salin juga berkas itu ke luar server (laptop/Drive) sebagai jaring pengaman ekstra.

### 0.2 Simpan baseline untuk perbandingan (paritas)

```bash
mkdir -p /tmp/nyawiji-baseline
for t in Kapanewon Kalurahan HealthCenter Posyandu User Patient Measurement; do
  sqlite3 prisma/dev.db "SELECT COUNT(*) FROM $t;" > "/tmp/nyawiji-baseline/$t.count"
  echo "$t: $(cat /tmp/nyawiji-baseline/$t.count)"
done
```
Baseline agregat (dipakai membandingkan sebelum vs sesudah):
```bash
sqlite3 prisma/dev.db -json "
SELECT strftime('%Y-%m', datetime(sessionDate/1000,'unixepoch','localtime')) AS ym,
       COUNT(DISTINCT patientId) AS numerator
FROM Measurement GROUP BY ym ORDER BY ym;" > /tmp/nyawiji-baseline/coverage.json
cat /tmp/nyawiji-baseline/coverage.json
```

---

## 1. Siapkan PostgreSQL

```bash
sudo -u postgres createuser --pwprompt nyawiji     # catat passwordnya
sudo -u postgres createdb -O nyawiji nyawiji
```
Isi `.env` (JANGAN commit berkas ini):
```env
DATABASE_URL="postgresql://nyawiji:<password>@localhost:5432/nyawiji?schema=public"
```

> Catatan: `?schema=public` dipahami Prisma, **tidak** dipahami `pg_dump`/`pg_restore`.
> Skrip di repo sudah otomatis membuang bagian itu (`${DATABASE_URL%%\?*}`).

Dorong skema (database masih kosong):
```bash
cd /opt/nyawiji && git pull
npm ci
npx prisma db push
```

---

## 2. Ekspor data SQLite → JSON

Ekspor per tabel, **urut sesuai ketergantungan kunci asing**:

```bash
cd /opt/nyawiji
DB="prisma/dev.db"
OUT="/tmp/nyawiji-export"; mkdir -p "$OUT"
for t in Kapanewon Kalurahan HealthCenter Posyandu User Patient Measurement; do
  sqlite3 "$DB" -json "SELECT * FROM $t;" > "$OUT/$t.json"
  echo "$t -> $(wc -c < "$OUT/$t.json") byte"
done
ls -lh "$OUT"
```

Nilai yang perlu diperhatikan (akan dikonversi skrip impor):

| Kolom | Bentuk di SQLite | Bentuk di PostgreSQL |
|---|---|---|
| semua `DateTime` (`createdAt`, `updatedAt`, `birthDate`, `sessionDate`, `disabledAt`) | bilangan epoch-milidetik | `timestamp(3)` |
| `Boolean` (`mustChangePassword`, `isPregnant`, `weightFaltering2T`, `exclusiveBreastfeeding`) | `0` / `1` / `null` | `true` / `false` / `null` |
| `Int`, `Float`, `String` | sama | sama |

---

## 3. Impor JSON → PostgreSQL

Simpan skrip berikut sebagai `scripts/import-sqlite-to-postgres.mjs` saat eksekusi
(belum ada di repo karena tidak dapat diuji tanpa PostgreSQL):

```js
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
```

Jalankan:
```bash
cd /opt/nyawiji
node --env-file=.env scripts/import-sqlite-to-postgres.mjs /tmp/nyawiji-export
```

Skrip **idempoten**: target dibersihkan lebih dulu, jadi aman diulang bila ada galat.

---

## 4. Verifikasi paritas (WAJIB)

### 4.1 Jumlah baris

```bash
for t in Kapanewon Kalurahan HealthCenter Posyandu User Patient Measurement; do
  PG=$(psql "$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '\"' | cut -d'?' -f1)" \
       -tAc "SELECT COUNT(*) FROM \"$t\";")
  SQ=$(cat "/tmp/nyawiji-baseline/$t.count")
  [ "$PG" = "$SQ" ] && echo "OK   $t: $PG" || echo "BEDA $t: sqlite=$SQ postgres=$PG"
done
```

### 4.2 Agregat bulanan

```bash
psql "$PG_URL" -c "
SELECT to_char(\"sessionDate\" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta','YYYY-MM') AS ym,
       COUNT(DISTINCT \"patientId\") AS numerator
FROM \"Measurement\" GROUP BY ym ORDER BY ym;"
```
Bandingkan dengan `/tmp/nyawiji-baseline/coverage.json`. **Angka harus sama.**

### 4.3 Uji timezone (batas bulan)

Pastikan pengukuran tanggal 1 pukul 00:00 WIB tidak bergeser ke bulan sebelumnya —
uji otomatis sudah tersedia di `src/lib/analytics.integration.test.ts`
(blok "konversi bulan lintas zona waktu").

---

## 5. Cutover

```bash
cd /opt/nyawiji
sudo touch /var/www/maintenance.on     # 1. tutup akses (bila belum)
pm2 stop posyandu-nyawiji              # 2. stop agar tidak ada tulisan
rm -rf .next                           # 3. buang build lama (provider berubah)
npx prisma db push                     # 4. sinkronkan skema + regenerate client
# (impor data: lihat §3 — cukup sekali; kalau sudah, lewati)
npm run build                          # 5. WAJIB sebelum start
pm2 start posyandu-nyawiji             # 6. nyalakan
pm2 save
curl -I http://127.0.0.1:3001          # 7. harus 200
sudo rm /var/www/maintenance.on        # 8. buka akses setelah verifikasi §6
```

Urutan ini penting: `rm -rf .next` + `build` setelah provider berubah. `pm2 restart`
sebelum `build` sukses menghasilkan crash-loop.

---

## 6. Verifikasi pasca-cutover

```bash
cd /opt/nyawiji
npm run lint
npm test                    # unit + integrasi (butuh nyawiji_test)
npm run db:verify-weight    # paritas N/T & 2T
pm2 logs posyandu-nyawiji --lines 50
```
Lanjutkan dengan `docs/uat-deploy-checklist.md` (per peran Kader/Puskesmas/Dinkes),
khususnya:
- kartu "Progres Berat Badan" & daftar 2T (memakai query agregasi),
- export Excel,
- input pengukuran baru + autosave,
- dashboard Dinkes (agregat).

Database uji integrasi (sekali saja):
```bash
sudo -u postgres createdb -O nyawiji nyawiji_test
# bila perlu menimpa: TEST_DATABASE_URL=... npm test
```

---

## 7. Rollback

**Kode** (kembali ke `main` tanpa perubahan Postgres):
```bash
cd /opt/nyawiji
git revert -m 1 <commit-merge>
rm -rf .next && npm ci && npx prisma db push && npm run build
pm2 restart posyandu-nyawiji
```

**Database** (kembali ke SQLite):
1. Set `.env` kembali: `DATABASE_URL="file:./dev.db?connection_limit=1"`.
2. Pulihkan berkas dari backup §0.1 bila perlu:
   ```bash
   cp "/tmp/nyawiji-$STAMP.db" prisma/dev.db
   sqlite3 prisma/dev.db 'PRAGMA integrity_check;'   # harus: ok
   ```
3. Ulangi urutan `rm -rf .next` → `npx prisma db push` → `npm run build` → `pm2 restart`.

Data yang masuk ke PostgreSQL setelah cutover tidak otomatis kembali ke SQLite —
karena itu jendela pemeliharaan dijaga singkat dan verifikasi §4/§6 dilakukan sebelum
membuka akses.

---

## 8. Troubleshooting

| Gejala | Penyebab | Tindakan |
|---|---|---|
| `invalid URI query parameter: schema` | `?schema=` diteruskan ke `pg_dump`/`pg_restore` | pastikan memakai skrip di repo (otomatis membuang query) |
| Query agregasi error `column m.sessiondate does not exist` | identifier camelCase tidak di-quote | tulis `"sessionDate"`, `"Measurement"`, `"posyanduId"` |
| Bulan meleset satu (Oktober terbaca September) | timezone | pastikan `Asia/Jakarta` + `AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta'` |
| `Property '...' does not exist` saat build | Prisma Client basi | `npx prisma generate` / `npx prisma db push` lalu build ulang |
| `Unique constraint failed` saat impor | target belum kosong | skrip menghapus target dulu; pastikan dijalankan sekali dari awal |
| `could not connect to server` | PostgreSQL mati / `DATABASE_URL` salah | `systemctl status postgresql`, cek user/password/port |
| App crash-loop `Could not find a production build` | `pm2 start` sebelum `npm run build` | build dulu, baru start |
| Kader tidak bisa masuk setelah cutover | `SESSION_SECRET` berubah atau `tokenVersion` berbeda | minta login ulang; cek `pm2 logs` |

---

## 9. Catatan pasca-migrasi

- **Backup berubah bentuk**: kini `pg_dump` (`.dump.gz`), bukan berkas SQLite.
  Retensi 7 harian + 6 bulanan tetap (`scripts/backup-db.sh`).
- **Arsip SQLite lama tetap simpan** minimal satu siklus bulan penuh; jangan dihapus
  sebelum yakin tidak ada yang perlu di-rollback.
- **PWA tidak perlu install ulang** bila hanya database yang dipindah (domain tetap).
  Install ulang hanya bila domain/origin berubah (`docs/DEPLOY-BARU.md §8`).
- Perbarui dokumentasi operasional setelah migrasi berhasil: `README.md`,
  `DEPLOY-UPDATE.md`, `docs/DEPLOY-BARU.md`, `CONTEXT.md`.
