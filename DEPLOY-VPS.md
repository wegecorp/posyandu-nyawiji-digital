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
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_NAME="Posyandu Digital Gunungkidul"
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

## 8. Cadangan (backup)

Database = file `prisma/dev.db`. Backup berkala:

```bash
sqlite3 prisma/dev.db ".backup '/backup/posyandu_$(date +%F).db'"
# atau cukup copy file saat aplikasi tidak sedang menulis
```

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
