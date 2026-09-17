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

## 4. Menutup akses sementara (jendela maintenance)

Dipakai saat cutover/migrasi database: seluruh pengguna (termasuk kader) diblokir,
hanya melihat halaman pemeliharaan. Tidak perlu menghentikan PM2 untuk mengaktifkannya.

File terkait (di repo, ikut ter-version):

- `deploy/maintenance.html` — halaman pemeliharaan (self-contained, tanpa aset eksternal).
- `deploy/nginx-posyandu.conf` — konfigurasi Nginx lengkap (`error_page 503` + saklar).

Pemasangan sekali per server:

```bash
cd /opt/nyawiji && git pull
sudo cp deploy/maintenance.html /var/www/maintenance.html
sudo cp /etc/nginx/sites-available/posyandu /etc/nginx/sites-available/posyandu.bak
sudo cp deploy/nginx-posyandu.conf /etc/nginx/sites-available/posyandu
sudo nginx -t && sudo systemctl reload nginx
```

Membuka/menutup akses (tidak perlu reload Nginx):

```bash
sudo touch /var/www/maintenance.on   # BLOKIR — semua path, termasuk /api/*
sudo rm    /var/www/maintenance.on   # normal kembali
```

Verifikasi:

```bash
curl -sI --resolve posyandunyawiji.my.id:443:127.0.0.1 https://posyandunyawiji.my.id | head -1
# tanpa penanda -> 200 ; dengan penanda -> 503
curl -sI --resolve posyandunyawiji.my.id:443:127.0.0.1 https://posyandunyawiji.my.id/maintenance.html | head -1
# -> 404 (halaman `internal`, tidak bisa dibuka langsung)
```

> Bila `nginx -t` gagal, **jangan** reload. Pulihkan:
> `sudo cp /etc/nginx/sites-available/posyandu.bak /etc/nginx/sites-available/posyandu`.

> Jangan tinggalkan `/var/www/maintenance.on` menyala. Sebelum menutup, pastikan migrasi
> sudah siap; jendela panjang tanpa pengumuman = kader tidak bisa input.

---

## 5. Rilis spesifik — kolom input sesuai sasaran (ADR 0005)

Perubahan ini **frontend-only** (tanpa perubahan `prisma/`) → cukup **Jalur A**.
Kolom pengukuran kini mengikuti umur/sasaran (bayi tanpa kolesterol, dsb),
dihitung live dari tanggal lahir + bulan sesi. Tidak ada migrasi DB; data lama
tetap aman dan diabaikan analitik bila tak lagi berlaku.

```bash
cd /opt/nyawiji
git pull
npm ci
git diff --name-only HEAD@{1} HEAD -- prisma/   # HARUS kosong

npm run build            # wajib sukses
pm2 restart posyandu-nyawiji
pm2 logs posyandu-nyawiji --lines 50
curl -I http://127.0.0.1:3001          # 200
```

Verifikasi cepat (login **POSYANDU**, buka input pengukuran):

1. Pasien **Bayi / Balita** → Lab hanya **Hemoglobin (HB)**; tak ada Kolesterol/GDS/Asam Urat.
2. Pasien **Lansia** → ada **Gula Darah, Kolesterol, Asam Urat, Lingkar Perut**.
3. Pasien **Ibu Hamil** → ada **Usia Kehamilan** + Tensi + LiLA.
4. Edit sesi **bulan lampau** (saat pasien masih bayi) → kolom ikut menyesuaikan.

Rollback (frontend-only, tanpa DB):

```bash
cd /opt/nyawiji
git revert <commit_ini> --no-edit
npm run build
pm2 restart posyandu-nyawiji
```

> Tanpa perubahan schema: **tidak perlu** `prisma db push`, `db:backfill`, atau
> `rm -rf .next` (tidak ada route yang dihapus di rilis ini).

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
