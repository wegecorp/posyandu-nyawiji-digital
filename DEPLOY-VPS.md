# Deploy ke VPS (Linux / Ubuntu)

Panduan ringkas migrasi aplikasi + data (30 Puskesmas & ±1.400 Posyandu Gunungkidul)
ke VPS. Satu perintah saja untuk data: `npm run data:gunungkidul -- file.csv` — **idempotent**,
aman dijalankan ulang saat data berubah.

> Aplikasi ini memakai **PostgreSQL**. Prasyarat: paket `postgresql` +
> `postgresql-client` terpasang dan database sudah dibuat (`createdb nyawiji`)
> sebelum langkah 4.

---

## 1. Prasyarat VPS

- Ubuntu 22.04 / 24.04 (min. 1 GB RAM)
- Node.js **20+** (disarankan 22 LTS)
- PostgreSQL 16 (`postgresql` + `postgresql-client`)
- PM2
- Timezone server **Asia/Jakarta** (WAJIB — perhitungan bulan sesi memakai zona ini)

```bash
# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git postgresql postgresql-client

# Timezone (WAJIB): sesi posyandu dikelompokkan per bulan waktu Jakarta.
sudo timedatectl set-timezone Asia/Jakarta

# PM2 global
sudo npm i -g pm2
```

## 2. Ambil kode & pasang dependensi

```bash
cd /opt
sudo git clone https://github.com/wegecorp/posyandu-nyawiji-digital.git nyawiji
sudo chown -R $USER:$USER nyawiji
cd nyawiji
npm ci
```

## 3. File environment

Buat `.env` di folder project:

```env
DATABASE_URL="postgresql://nyawiji:<password>@localhost:5432/nyawiji?schema=public"
NEXT_PUBLIC_APP_NAME="PORTAL NYAWIJI"
SESSION_SECRET="<string acak sangat panjang — WAJIB beda dari dev>"
DINKES_ADMIN_USERNAME="dinkes_gk"
DINKES_ADMIN_PASSWORD="<password admin yang kuat>"
POSYANDU_DEFAULT_PASSWORD="<password default kader — ganti sebelum sosialisasi>"
PUSKESMAS_DEFAULT_PASSWORD="<password default staf puskesmas — WAJIB beda dari posyandu>"
```

> `SESSION_SECRET` wajib diisi: di produksi aplikasi **sengaja gagal** kalau kosong.

## 4. Siapkan database + data awal

```bash
sudo -u postgres createuser --pwprompt nyawiji      # sekali saja; catat passwordnya
sudo -u postgres createdb -O nyawiji nyawiji
npx prisma db push
npm run db:seed                                   # 18 Kapanewon + akun DINKES
npm run data:gunungkidul -- /tmp/daftarposyandu.csv   # 30 Puskesmas + akun staf + Posyandu + akun kader
```

Cara ambil CSV ke server:

```bash
scp daftarposyandu.csv user@IP_VPS:/tmp/daftarposyandu.csv
# atau upload via panel file manager VPS
```

**Pembaruan data nanti:** cukup ganti file CSV lalu jalankan ulang perintah di atas —
posyandu yang sama akan dilewati, yang baru ditambahkan.

## 5. Build & jalankan dengan PM2

```bash
npm run build
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # ikuti instruksi yang muncul agar autostart saat reboot
```

Port diambil dari env `PORT`; default `3001`. Kalau perlu ganti:

```bash
PORT=4000 pm2 start ecosystem.config.cjs --update-env
```

Cek: `pm2 status` dan `pm2 logs posyandu-nyawiji`.

Aplikasi berjalan di `http://IP_VPS:3001`.

## 6. (Opsional) Reverse proxy Nginx + HTTPS

```nginx
server {
    listen 80;
    server_name posyandu.domain.id;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Lalu pasang sertifikat dengan certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d posyandu.domain.id
```

## 7. Update aplikasi (rutin)

> Panduan update satu halaman: **`DEPLOY-UPDATE.md`** (cek schema → jalur frontend-only /
> jalur ada schema → verifikasi → rollback → jebakan).

Checklist verifikasi lengkap (UAT per peran + rollback): `docs/uat-deploy-checklist.md`.

## 8. Swap (disarankan untuk VPS 2 GB)

`npm run build` dan Prisma bisa memakai memori lebih dari 1 GB. Tanpa swap, VPS 2 GB
berisiko OOM saat build. Tambahkan swap 2 GB sekali saja:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Cek: `free -h` (baris `Swap:` harus 2.0Gi).

## 9. Backup & pemulihan database

Semua data ada di database PostgreSQL `nyawiji`. Backup memakai `pg_dump` format
custom (`.dump`) lalu digzip — portable, bisa dibaca ulang oleh `pg_restore`.

**Retensi:** 7 backup harian + 6 backup bulanan (harian ke-8 dan bulanan ke-7 dihapus
otomatis). Total kecil, tapi cukup menutup kasus kesalahan yang baru ketahuan lama.

### 9a. Siapkan script

Script otomatis mendeteksi lokasi repo (dari letak dirinya sendiri), jadi bisa
di-clone di path mana pun — tidak harus `/opt/nyawiji`. Script membaca `DATABASE_URL`
dari `.env`. Jalankan dari dalam folder repo:

```bash
chmod +x scripts/backup-db.sh scripts/restore-db.sh
sudo mkdir -p /var/backups/posyandu
```

Sekaligus tes manual:

```bash
sudo BACKUP_ROOT=/var/backups/posyandu scripts/backup-db.sh
```

### 9b. Hubungkan Google Drive (rclone) — sekali saja

Pakai **akun Google khusus backup** (bukan akun Gmail aktif) supaya kuota gratis
15 GB tidak terbagi dengan Gmail/Foto.

```bash
sudo apt install -y rclone
rclone config
```

Di dalam `rclone config`:
1. `n` (new remote).
2. Name: `gdrive`.
3. Storage: pilih `drive` (Google Drive).
4. `client_id` / `client_secret`: kosongkan (Enter).
5. Scope: pilih `1` (Full access) atau `3` (drive.file).
6. `Edit advanced config?` → `n`.
7. `Use auto config?` → `n` (VPS tanpa browser).
8. rclone menampilkan perintah `rclone authorize "drive"`. Jalankan perintah itu di
   **komputer lokal** yang punya browser, login akun Google backup, salin token yang
   muncul, tempel di VPS.
9. Simpan (`y`), keluar (`q`).

Tes koneksi:

```bash
rclone mkdir gdrive:posyandu-backup
rclone lsd gdrive:
```

### 9c. Jadwalkan dengan cron

```bash
sudo crontab -e
```

Tambahkan (opsional: isi token Telegram untuk notifikasi saat gagal).
Ganti `/opt/nyawiji` dengan lokasi repo sebenarnya:

```cron
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""
0 2 * * * /opt/nyawiji/scripts/backup-db.sh >> /var/log/posyandu-backup.log 2>&1
```

Lihat hasilnya: `sudo tail -n 20 /var/log/posyandu-backup.log`.

### 9d. Pemulihan (restore)

**Peringatan:** restore menimpa database yang sedang aktif. Aplikasi dihentikan
sementara, database lama disimpan sebagai `posyandu-sebelum-restore-<timestamp>.dump`.

```bash
cd /opt/nyawiji
sudo scripts/restore-db.sh daily:2026-09-10
# dari Google Drive:
sudo scripts/restore-db.sh monthly:2026-09-01 --from-drive
# darurat tanpa konfirmasi:
sudo scripts/restore-db.sh daily:2026-09-10 --yes
```

Setelah restore, cek `pm2 logs posyandu-nyawiji` dan pastikan data terbaca.

> Uji restore minimal sekali sebelum benar-benar mengandalkannya. Backup yang tak
> pernah diuji belum bisa disebut backup.

---

### Catatan penting

- **Akun baru = password default sesuai role** lalu **aktivasi paksa** (ganti password) saat login
  pertama:
  - Kader Posyandu → `POSYANDU_DEFAULT_PASSWORD`.
  - Staf Puskesmas → `PUSKESMAS_DEFAULT_PASSWORD` (berbeda dari posyandu).
  Sampaikan password default ini lewat jalur resmi.
- **Username staf Puskesmas dibuat otomatis dari nama** (mis. `pkm_semanu1`, `pkm_wonosari2`) dan
  tampil di dashboard DINKES — cukup disebarkan, tidak perlu dibuat manual.
- Penulisan nama dinormalisasi saat seed/import: angka romawi dipertahankan kapital
  (`Puskesmas Wonosari II`, bukan `... Ii`).
- Kader login memakai **cascade picker** (Puskesmas → Kalurahan → Posyandu) — tidak perlu username.
- Staf Puskesmas/DINKES login memakai **username + password** (username tampil di dashboard DINKES).

---

## 10. Checklist lanjutan (status per 2026-09-10)

VPS cadangan: aplikasi jalan di port 3001 (fork mode, `ecosystem.config.cjs`), 3000 dipakai
`sirkumboy-dashboard`. Backup lokal berjalan di `/var/backups/posyandu`.

- [ ] Setup `rclone` ke Google Drive memakai akun khusus backup — bagian 9b.
- [ ] Pasang cron backup harian (harian 7 + bulanan 6) — bagian 9c.
- [ ] Verifikasi backup terkirim ke Drive, lalu **uji restore** sekali — bagian 9d.
- [ ] Akses publik tanpa beli domain: Nginx + HTTPS via `sslip.io`, aplikasi bind ke
      `127.0.0.1:3001`, port 3001 ditutup dari publik.
- [ ] Buka hanya port yang perlu (80/443) untuk challenge certbot + HTTPS.
- [ ] (Opsional) Redam error bot di log: blokir `POST` ber-header `Next-Action` di Nginx.
- [ ] Migrasi ke VPS produksi (asli) dengan langkah yang sama.
