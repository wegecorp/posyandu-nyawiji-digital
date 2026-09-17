# Update Aplikasi di VPS (Singkat)

Panduan satu halaman untuk merilis perubahan kode ke VPS yang **sudah berjalan**.
Asumsi: repo di `/opt/nyawiji`, PM2 app `posyandu-nyawiji`, port `3001`.

Setup pertama kali & backup: `docs/DEPLOY-BARU.md` + `DEPLOY-VPS.md`.
Verifikasi pasca-rilis: `docs/uat-deploy-checklist.md`.

---

## 0. Tarik kode terbaru

```bash
cd /opt/nyawiji
git pull
npm ci
```

## 1. Cek ada perubahan schema?

```bash
git diff --name-only HEAD@{1} HEAD -- prisma/   # kosong = frontend-only (Jalur A)
```

- **Kosong** → **Jalur A** (UI/komponen saja).
- **Ada isi** → **Jalur B** (ada kolom/model baru).

---

## Jalur A — frontend-only (tanpa perubahan schema)

```bash
cd /opt/nyawiji
npm run build            # HARUS sukses sebelum restart
pm2 restart posyandu-nyawiji
pm2 logs posyandu-nyawiji --lines 50   # pastikan tidak ada error
```

## Jalur B — ada perubahan schema

```bash
cd /opt/nyawiji
pm2 stop posyandu-nyawiji    # stop dulu: cegah crash-loop saat .next dihapus
rm -rf .next                 # WAJIB bila ada route yang dihapus/diganti (cegah tipe basi)
npx prisma db push           # tambah kolom DB + REGENERATE Prisma Client
npm run db:backfill          # isi kolom turunan (N/T & 2T) untuk data lama — idempoten
npm run build                # prisma generate jalan otomatis; HARUS sukses
pm2 start posyandu-nyawiji
pm2 save
```

Opsional — data wilayah terbaru (atau lewat Import di web DINKES):

```bash
npm run data:gunungkidul -- /tmp/daftarposyandu.csv
```

---

## 2. Verifikasi

```bash
pm2 status
pm2 logs posyandu-nyawiji --lines 50
curl -I http://127.0.0.1:3001          # harus 200
```

Ganti kategori umur / hitung ulang data turunan: login **DINKES**, panggil
`POST /api/dinkes/backfill-growth`.

## 3. Rollback

Kode:

```bash
cd /opt/nyawiji && git revert <commit> --no-edit && npm run build && pm2 restart posyandu-nyawiji
```

Database (bila data rusak):

```bash
cd /opt/nyawiji
sudo scripts/restore-db.sh daily:<tanggal>          # dari backup lokal
sudo scripts/restore-db.sh monthly:<tanggal> --from-drive   # dari Google Drive
```

---

## Jebakan (sering kejadian)

- **`pm2 restart` sebelum `npm run build` sukses** → crash-loop
  `Could not find a production build in the '.next' directory`. Setelah
  `rm -rf .next`, wajib build ulang dulu. Build OOM → tambah swap (`DEPLOY-VPS.md §8`).
- **Build gagal `Property '...' does not exist` / `does not exist in type 'MeasurementSelect'`**
  → Prisma Client basi. Jalankan `npx prisma db push`, lalu build ulang.
- **Rilis tanpa perubahan schema** (mis. hanya UI/endpoint): lewati `prisma db push`
  dan `db:backfill`. `rm -rf .next` tetap disarankan bila ada route lama dihapus.
- **Ganti domain/origin** → PWA terpasang harus **install ulang** di perangkat kader
  (data di server aman).
- **Jaringan instansi blokir/SSL-inspection** → tes dari data seluler dulu;
  lihat `docs/DEPLOY-BARU.md §6`.
