# Deploy Baru — VPS Ubuntu 24.04

Panduan setup VPS dari nol (baru beli) sampai aplikasi live dengan HTTPS.
Hasil akhir: `https://<host>`, PWA bisa di-install, backup harian jalan.

> Ganti tiap `<...>` dengan nilai nyata. **Jangan** simpan password/secret di file ini.

---

## 0. Prasyarat
- VPS Ubuntu 24.04 LTS, RAM ≥ 2 GB.
- Akses SSH (password atau key).
- Public IP statis.
- Repo: `https://github.com/wegecorp/posyandu-nyawiji-digital.git`

---

## 1. Hardening awal (setelah login pertama)

```bash
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone Asia/Jakarta
sudo hostnamectl set-hostname posyandu

# SSH: root mati (image cloud biasanya sudah mengunci root)
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf >/dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication yes
PubkeyAuthentication yes
EOF
sudo sshd -t && sudo systemctl restart ssh

# Firewall
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable

# fail2ban (Ubuntu 24.04 perlu backend systemd)
sudo apt install -y fail2ban
sudo tee /etc/fail2ban/jail.local >/dev/null <<'EOF'
[DEFAULT]
backend = systemd
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port    = ssh
logpath = %(sshd_log)s
EOF
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd

# Swap 2 GB (cegah OOM saat build)
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

> Untuk keamanan lebih tinggi: pakai SSH key dan set `PasswordAuthentication no`
> **hanya setelah** login key terbukti jalan di sesi terpisah.

---

## 2. Runtime

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt install -y git sqlite3 nginx rclone certbot python3-certbot-nginx
sudo npm i -g pm2
node -v && pm2 -v
```

---

## 3. Ambil kode & environment

```bash
sudo mkdir -p /opt/nyawiji && sudo chown ubuntu:ubuntu /opt/nyawiji
git clone https://github.com/wegecorp/posyandu-nyawiji-digital.git /opt/nyawiji
cd /opt/nyawiji
cp .env.example .env
chmod 600 .env
openssl rand -hex 32   # -> SESSION_SECRET
```

Isi `.env` (semua password **baru & kuat**, bukan default lama):

```env
DATABASE_URL="file:./dev.db?connection_limit=1"
NEXT_PUBLIC_APP_NAME="Posyandu Nyawiji Digital"
SESSION_SECRET="<hasil openssl rand -hex 32>"
DINKES_ADMIN_USERNAME="dinkes_gk"
DINKES_ADMIN_PASSWORD="<kuat>"
POSYANDU_DEFAULT_PASSWORD="<kuat>"
PUSKESMAS_DEFAULT_PASSWORD="<kuat, beda dari posyandu>"
```

Upload CSV dari laptop:

```bash
scp daftarposyandu.csv ubuntu@<IP>:/tmp/daftarposyandu.csv
```

Seed + build:

```bash
cd /opt/nyawiji
npm ci
npx prisma db push
npm run db:seed
npm run data:gunungkidul -- /tmp/daftarposyandu.csv
mkdir -p logs
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # jalankan perintah sudo yang tercetak
```

Verifikasi: `pm2 status` dan `curl -I http://127.0.0.1:3001` (harus 200).

---

## 4. Nginx + HTTPS (sslip.io, tanpa domain)

Hostname `sslip.io` dibentuk dari IP dengan strip. Contoh IP `<IP-publik>`
→ `43-157-212-165.sslip.io`.

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo tee /etc/nginx/sites-available/nyawiji >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name <IP-strip>.sslip.io;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/nyawiji /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# pastikan port 80 & 443 dibuka juga di security group provider
curl -I http://<IP-strip>.sslip.io        # harus 200/307

sudo certbot --nginx -d <IP-strip>.sslip.io   # pilih redirect HTTP->HTTPS
sudo certbot renew --dry-run
curl -I https://<IP-strip>.sslip.io        # harus 200
```

PWA: buka di HP (data seluler) → menu Install → ikon **Nyawiji**.

---

## 5. Backup

```bash
cd /opt/nyawiji
chmod +x scripts/backup-db.sh scripts/restore-db.sh
sudo mkdir -p /var/backups/posyandu
sudo BACKUP_ROOT=/var/backups/posyandu scripts/backup-db.sh
ls -lh /var/backups/posyandu/daily/
```

Google Drive (opsional, lihat `DEPLOY-VPS.md §9b`):

```bash
rclone config          # remote "gdrive"
rclone mkdir gdrive:posyandu-backup
sudo BACKUP_ROOT=/var/backups/posyandu scripts/backup-db.sh
```

Cron harian:

```cron
0 2 * * * /opt/nyawiji/scripts/backup-db.sh >> /var/log/posyandu-backup.log 2>&1
```

Uji restore sekali (wajib):

```bash
sudo scripts/restore-db.sh daily:<tanggal>
```

---

## 6. Kendala jaringan kantor (SSL inspection)

Gejala: di jaringan instansi, browser bilang "not secure"/error walau server benar.
Penyebab: firewall instansi (mis. Fortinet) melakukan **SSL inspection (MITM)** dan/atau
memblokir kategori "dynamic DNS" (sslip.io, DuckDNS, dll).

Cara memastikan server baik-baik saja (jalankan di VPS):

```bash
openssl s_client -connect <host>:443 -servername <host> -showcerts </dev/null 2>/dev/null | grep -E "s:|i:"
```

Kalau issuer **Let's Encrypt** (bukan Fortinet) → server sehat, masalah di jaringan klien.

Solusi:
1. Tes/pakai dari **data seluler** (yang dipakai kader asli) — normal.
2. Minta IT instansi **whitelist** hostname + masukkan ke **SSL-inspection exemption**.
3. Jangka panjang: pakai **subdomain resmi instansi** atau domain `.my.id`/`.id`
   (TLD normal, lebih kecil kemungkinan diblokir), lalu whitelist + SSL-exempt.

---

## 7. Update rutin

```bash
cd /opt/nyawiji
git pull
npm ci
pm2 stop posyandu-nyawiji
rm -rf .next
npx prisma db push
npm run db:backfill
npm run build            # HARUS sukses sebelum start
pm2 start posyandu-nyawiji
pm2 save
```

---

## 8. Pindah ke domain sendiri (setelah domain dibeli)

Tetap jalankan sslip.io untuk sementara; saat domain siap:

1. **DNS**: buat **A record** `posyandu.<domain>` → `<IP publik VPS>`
   (opsional AAAA bila ada IPv6). Tunggu propagasi:
   ```bash
   nslookup posyandu.<domain>
   ```
2. **Nginx**: tambahkan domain ke `server_name` (blok 80 dan 443):
   ```bash
   sudo nano /etc/nginx/sites-available/nyawiji
   # server_name <IP-strip>.sslip.io posyandu.<domain>;
   sudo nginx -t && sudo systemctl reload nginx
   ```
3. **Sertifikat domain** (biarkan cert sslip.io tetap ada saat transisi):
   ```bash
   sudo certbot --nginx -d posyandu.<domain> --redirect
   curl -I https://posyandu.<domain>
   ```

   > Bila muncul **"Could not automatically find a matching server block"**, artinya
   > `server_name` di Nginx belum memuat domain (langkah 2 belum jalan). Perbaiki
   > `server_name` dulu, reload, lalu pasang cert yang sudah terbit:
   > ```bash
   > sudo certbot install --cert-name posyandu.<domain> --nginx
   > ```
   > Nama file config biasanya `/etc/nginx/sites-available/posyandu` (bukan `nyawiji`).
4. **Opsional** hapus cert sslip.io setelah domain stabil:
   ```bash
   sudo certbot delete --cert-name <IP-strip>.sslip.io
   ```
5. **PWA**: origin berubah → pengguna perlu **install ulang** dari domain baru
   (data di server tidak terpengaruh). Umumkan ke kader bila perlu.
6. Pastikan **port 80 & 443** terbuka di security group provider untuk domain baru.

---

## Status deploy

Terakhir diperbarui: 2026-09-11.

- [x] VPS Ubuntu 24.04 + hardening (ufw, fail2ban) + swap 2 GB
- [x] Node 22, PM2, Nginx, sqlite3, certbot
- [x] App live dengan HTTPS + domain sendiri
- [x] PM2 autostart (`pm2 save` + `pm2 startup`, terbukti setelah reboot)
- [x] Backup lokal harian (cron) ke `/var/backups/posyandu`
- [ ] **Backup Google Drive (rclone) — TERTUNDA** (menunggu akun Google khusus backup)
- [ ] Deploy key GitHub (agar `git pull` tanpa prompt)
- [ ] Subdomain `www` (opsional)
- [ ] UAT: `docs/uat-deploy-checklist.md`

> Lanjutkan backup Drive kapan saja: §5 di dokumen ini + `DEPLOY-VPS.md §9b`.
> Siapkan **akun Google khusus backup** (bukan akun utama; hindari akun kantor yang bisa
> dinonaktifkan admin).

---

## Catatan keamanan
- Ganti semua password default; nilai lama sudah pernah publik di git history.
- `DINKES_ADMIN_PASSWORD` dipakai untuk auto-bootstrap super-admin bila DB kosong
  (`src/app/api/auth/login/route.ts`) — wajib kuat.
- Jangan commit `.env`. Repo hanya memuat `.env.example`.
- Pindah hostname = PWA terpasang harus install ulang (origin terikat); data di server aman.
