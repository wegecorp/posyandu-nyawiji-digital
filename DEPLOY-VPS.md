# Deploy ke VPS (Linux / Ubuntu)

Panduan ringkas migrasi aplikasi + data (30 Puskesmas & ±1.400 Posyandu Gunungkidul)
ke VPS. Satu perintah saja untuk data: `npm run data:gunungkidul -- file.csv` — **idempotent**,
aman dijalankan ulang saat data berubah.

> Aplikasi ini memakai **SQLite** (1 file DB). Cocok untuk skala tahap awal.
> Bila nanti butuh banyak penulis bersamaan, migrasikan `provider` Prisma ke PostgreSQL.

---

## 1. Prasyarat VPS

- Ubuntu 22.04 / 24.04 (min. 1 GB RAM)
- Node.js **20+** (disarankan 22 LTS)
- PM2

```bash
# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

# PM2 global
sudo npm i -g pm2
```

## 2. Ambil kode & pasang dependensi

```bash
cd /opt
sudo git clone <URL_REPOSITORY_KAMU> posyandu_digital
sudo chown -R $USER:$USER posyandu_digital
cd posyandu_digital
npm ci
```

## 3. File environment

Buat `.env` di folder project:

```env
DATABASE_URL="file:./dev.db?connection_limit=1"
NEXT_PUBLIC_APP_NAME="POSYANDU NYAWIJI"
SESSION_SECRET="<string acak sangat panjang — WAJIB beda dari dev>"
DINKES_ADMIN_USERNAME="dinkes_gk"
DINKES_ADMIN_PASSWORD="<password admin yang kuat>"
POSYANDU_DEFAULT_PASSWORD="<password default kader — ganti sebelum sosialisasi>"
PUSKESMAS_DEFAULT_PASSWORD="<password default staf puskesmas — WAJIB beda dari posyandu>"
```

> `SESSION_SECRET` wajib diisi: di produksi aplikasi **sengaja gagal** kalau kosong.

## 4. Siapkan database + data awal

```bash
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

Cek: `pm2 status` dan `pm2 logs posyandu-digital`.

Aplikasi berjalan di `http://IP_VPS:3000`.

## 6. (Opsional) Reverse proxy Nginx + HTTPS

```nginx
server {
    listen 80;
    server_name posyandu.domain.id;

    location / {
        proxy_pass http://127.0.0.1:3000;
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

```bash
cd /opt/posyandu_digital
git pull
npm ci
npx prisma db push          # schema baru
npm run data:gunungkidul -- /tmp/daftarposyandu.csv   # data terbaru (opsional)
npm run build
pm2 restart posyandu-digital
```

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

Semua data ada di satu file: `prisma/dev.db`. Mode `WAL` sudah aktif otomatis
(aplikasi menjalankan `PRAGMA journal_mode=WAL` + `busy_timeout=5000` saat start),
sehingga penulis tidak lagi langsung gagal `database is locked`.

**Retensi:** 7 backup harian + 6 backup bulanan (harian ke-8 dan bulanan ke-7 dihapus
otomatis). Total kecil, tapi cukup menutup kasus kesalahan yang baru ketahuan lama.

### 9a. Siapkan script

```bash
cd /opt/posyandu_digital
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

Tambahkan (opsional: isi token Telegram untuk notifikasi saat gagal):

```cron
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""
0 2 * * * /opt/posyandu_digital/scripts/backup-db.sh >> /var/log/posyandu-backup.log 2>&1
```

Lihat hasilnya: `sudo tail -n 20 /var/log/posyandu-backup.log`.

### 9d. Pemulihan (restore)

**Peringatan:** restore menimpa database yang sedang aktif. Aplikasi dihentikan
sementara, database lama disimpan sebagai `dev.db.bak-<timestamp>`.

```bash
cd /opt/posyandu_digital
sudo scripts/restore-db.sh daily:2026-09-10
# dari Google Drive:
sudo scripts/restore-db.sh monthly:2026-09-01 --from-drive
# darurat tanpa konfirmasi:
sudo scripts/restore-db.sh daily:2026-09-10 --yes
```

Setelah restore, cek `pm2 logs posyandu-digital` dan pastikan data terbaca.

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
