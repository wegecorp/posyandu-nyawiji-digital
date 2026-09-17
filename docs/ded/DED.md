# DED — Detail Engineering Design Portal Nyawiji

Dokumen desain teknis untuk **developer Dinas Kesehatan Kabupaten Gunungkidul**.

| | |
|---|---|
| **Nama sistem** | Portal Nyawiji (Sistem Informasi Digitalisasi Posyandu & Pemantauan Kesehatan Siklus Hidup) |
| **Instansi** | Dinas Kesehatan Kabupaten Gunungkidul |
| **Lingkup wilayah** | 18 Kapanewon · 30 Puskesmas · ±1.400 Posyandu |
| **Jenis dokumen** | Detail Engineering Design (technical design doc) |
| **Versi skema domain** | Sesi bulanan (ADR-0002), Z-score Permenkes 2/2020 (ADR-0001), Skrining TB (ADR-0003), N/T & 2T 0–60 bulan (ADR-0004) |

Dokumen pendamping: `docs/ded/DFD.md` (aliran data), `docs/ded/ERD.md` (model data),
`docs/ded/FLOWCHART.md` (alur proses & sistem),
`docs/ded/RUNBOOK-MIGRASI-POSTGRESQL.md` (migrasi database), `CONTEXT.md` (glosarium domain).

---

## 1. Ringkasan

Portal Nyawiji adalah aplikasi web + PWA untuk mencatat pelayanan Posyandu (5 Langkah
ILP) dan memantau kesehatan siklus hidup warga, dengan tiga jenjang akses
(Kader → Puskesmas → Dinkes) dan privasi berjenjang (nama pasien hanya sampai
Puskesmas).

Karakter teknis utama:

1. **Satu aplikasi Next.js fullstack** — UI dan API dalam satu proses Node.
2. **Offline-first** — data dicatat di peramban lebih dulu lalu disinkronkan; penting
   untuk wilayah *blank spot*.
3. **Perhitungan klinis di server & klien** — Z-score 4 indeks, N/T, 2T, kategori umur.
4. **Fail-closed authorization** — sesi tanpa cakupan wilayah ditolak, bukan
   dikembalikan tanpa filter.
5. **Sesi = bulan** — satu pasien satu pengukuran per bulan; memudahkan rekapitulasi.

---

## 2. Stack & Versi

| Lapisan | Teknologi | Versi |
|---|---|---|
| Framework | Next.js (App Router) | 16.3.4 |
| UI | React | 19.2.8 |
| Bahasa | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| ORM | Prisma Client | 6.4.1 |
| Database | PostgreSQL | 16+ |
| Autentikasi | JWT (`jose`) + cookie HttpOnly | jose 6 |
| Hash password | bcryptjs | 3 |
| Excel | `xlsx` | 0.18.5 |
| QR Code | `qrcode` + `html5-qrcode` | 1.5 / 2.3 |
| Grafik | Recharts | 3.10 |
| Ikon | lucide-react | 1.40 |
| Runtime | Node.js | 20+ (disarankan 22 LTS) |
| Process manager | PM2 (fork, 1 instance) | — |
| Reverse proxy | Nginx + Certbot (Let's Encrypt) | — |
| Pengujian | Vitest | 3.2 |

Model terpasangnya: **satu proses Node** (`next start`) di balik Nginx, satu instance
PM2, satu database PostgreSQL lokal.

---

## 3. Aktor & Hak Akses

| Aktor | Level | Cakupan data | Wewenang |
|---|---|---|---|
| `POSYANDU` (Kader) | Padukuhan | posyandu sendiri | daftar/ubah pasien, catat pengukuran, cetak QR, export unitnya |
| `PUSKESMAS` (Staf) | Kapanewon | seluruh posyandu binaan | kelola akun posyandu, supervisi read-only (*Buka Meja*), rekap wilayah |
| `DINKES` (Admin) | Kabupaten | seluruh kabupaten | master data wilayah, akun Puskesmas, backfill, agregat kebijakan |

Matriks lengkap per aksi: `docs/ded/FLOWCHART.md` §5.

**Aturan privasi:** identitas pasien hanya untuk Posyandu (unitnya) dan Puskesmas
(binaannya). Dinkes menerima **agregat** — ditegakkan di API
(`src/lib/stats-access.ts`, `src/lib/patient-scope.ts`), bukan hanya di UI.

---

## 4. Kebutuhan Fungsional

Tujuh proses bisnis (rincian alur: `docs/ded/FLOWCHART.md` §3):

| # | Proses | Keluaran utama |
|---|---|---|
| 1 | Pelayanan Bayi & Balita (0–60 bln, lanjut s.d. 83 bln) | Z-score BB/U, TB/U, BB/TB, IMT/U; N/T; peringatan 2T; status ASI eksklusif; skrining TB; rujukan |
| 2 | Pelayanan Ibu Hamil | status KEK, hipertensi gestasional, anemia; rujukan ANC terpadu |
| 3 | Pelayanan Usia Sekolah & Remaja | IMT, tekanan darah, skrining indra, HB; konseling & TTD |
| 4 | Pelayanan Usia Produktif & Lansia (PTM) | tensi, GDS, kolesterol, asam urat, lingkar perut, skrining; rujukan poli |
| 5 | Validasi, Sinkronisasi Offline-First & Rekapitulasi | antrean tersinkron; Excel 4 sheet (Ringkasan, Daftar Anggota, Detail Pengukuran, Daftar Berisiko) |
| 6 | Pembinaan Wilayah & Pengelolaan Akun (Puskesmas) | akun posyandu terkelola; audit read-only; rekap wilayah |
| 7 | Tata Kelola Master Data & Agregasi (Dinkes) | master wilayah; backfill Z-score; laporan agregat kabupaten |

Fitur lintas proses: login cascade kader, aktivasi wajib ganti password, kartu QR
pasien, autosave, antrean luring, penomoran registrasi hierarkis
(`POS-<kode>-<tahun>-<urut>`), dan pemeliharaan jendela (*maintenance page*).

---

## 5. Kebutuhan Non-Fungsional

| Aspek | Target / Ketentuan | Implementasi |
|---|---|---|
| Ketahanan luring | input tetap bisa dilakukan tanpa sinyal | antrean `localStorage` + flush otomatis (`src/lib/offline-sync.ts`) |
| Integritas data | tidak ada duplikat meski retry | `clientId` (UUID) unik + kunci dedupe `posyandu+pasien+bulan` |
| Konsistensi bersamaan | tidak ada tulisan tak sengaja menimpa | `version` last-write-wins + `409` minta muat ulang |
| Kinerja | query agregasi tetap cepat seiring data tumbuh | indeks `sessionDate` dan unik `(patientId, sessionDate)` |
| Batas export | cegah server kehabisan memori | agregat tanpa batas; data per pasien maks **30 unit / 20.000 baris** |
| Keamanan sesi | sesi bisa dicabut seketika | JWT + `tokenVersion` dicocokkan ke DB tiap request |
| Rate limit | cegah brute force | login 20/menit, reset password 10/menit |
| Privasi | PDP / data medis | agregasi untuk Dinkes; scope fail-closed di API |
| Ketersediaan | operasional bulanan Posyandu | PM2 `autorestart` + `pm2 startup`; backup harian |
| Pemulihan | data bisa dipulihkan | `pg_dump` harian (7) + bulanan (6) + salinan Google Drive |
| Kompatibilitas | perangkat kader | PWA, Chrome/Edge Android, layar kecil, kamera untuk QR |
| Aksesibilitas | kader lansia | alur tanpa username (cascade), tombol besar, pesan bahasa Indonesia |
| Audit | jejak perubahan | `updatedBy`, `recordedBy`, `version`, `tokenVersion`, `disabledAt` |
| Observabilitas | diagnosa insiden | `pm2 logs` (`logs/out.log`, `logs/error.log`) |

---

## 6. Arsitektur Aplikasi

Aplikasi **satu halaman** (`src/app/page.tsx`) yang memuat komponen sesuai peran,
dengan API terpisah di `src/app/api/**`.

```mermaid
flowchart TB
    subgraph KLIEN["Peramban / PWA kader"]
        UI["UI React<br/>page.tsx + components/*"]
        Q["Antrean offline<br/>localStorage"]
        SW["Service Worker<br/>public/sw.js - API tidak di-cache"]
        LS["Cache sesi<br/>auth-context.tsx"]
    end

    subgraph SERVER["Next.js (Node, PM2 fork)"]
        RSC["Halaman & Routing App Router"]
        API["Route Handlers /api/**"]
        AUTH["api-auth.ts<br/>sesi + peran + fail-closed"]
        DOM["Domain lib:<br/>growth/, clinical.ts, analytics.ts,<br/>patient-scope.ts, export-limits.ts"]
        ORM["Prisma Client"]
    end

    DB[("PostgreSQL 16")]
    NGX["Nginx + TLS (Certbot)"]

    NGX --> RSC
    NGX --> API
    UI --> RSC
    UI -.-> Q
    Q -. flush saat online .-> API
    SW --> UI
    LS --> UI
    API --> AUTH --> DOM --> ORM --> DB
    RSC --> ORM
```

### Peta modul

| Area | Lokasi |
|---|---|
| Halaman SPA | `src/app/page.tsx` |
| Form pengukuran | `src/components/DynamicMeasurementForm.tsx` |
| Panel export | `src/components/ExportModal.tsx` |
| Dashboard/analisis | `src/components/DinkesDashboard.tsx`, `PuskesmasDashboard.tsx`, `src/components/analisis/*` |
| Agregasi statistik | `src/lib/analytics.ts`, `growth-analytics.ts`, `coverage-analytics.ts` |
| Growth engine | `src/lib/growth/*` |
| Kategori & label | `src/lib/utils.ts` (`getPatientCategory`), `types.ts` |
| Indikator klinis | `src/lib/clinical.ts` |
| Recompute N/T & 2T | `src/lib/weight-progression-db.ts` |
| Offline-sync | `src/lib/offline-sync.ts` |
| Export Excel | `src/lib/member-export.ts`, `src/app/api/stats/report/route.ts` |
| Skema DB | `prisma/schema.prisma` |

---

## 7. Arsitektur Data

Model relasional 7 tabel utama: `Kapanewon`, `Kalurahan`, `HealthCenter`, `Posyandu`,
`User`, `Patient`, `Measurement`. Diagram relasi, kunci, indeks, aturan cascade, dan
alur kolom turunan ada di **`docs/ded/ERD.md`**.

Poin yang wajib dipahami developer berikutnya:

- **`DateTime` disimpan UTC** (`timestamp(3)` tanpa zona).
- **Nama tabel/kolom camelCase** → wajib di-quote di SQL mentah.
- **Bulan sesi** dihitung `to_char("sessionDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')`
  → **timezone server wajib `Asia/Jakarta`** (`timedatectl set-timezone Asia/Jakarta`).
- **`Measurement` unik** pada (`patientId`, `sessionDate`); race dijaga dengan menangkap
  `P2002` lalu beralih ke `update`.

---

## 8. Topologi Infrastruktur & Deployment

### 8.1 Produksi (VPS saat ini)

```mermaid
flowchart LR
    K["Perangkat kader<br/>(HP / tablet)"] -->|HTTPS| NGX
    P["Staf Puskesmas<br/>Dinkes"] -->|HTTPS| NGX
    NGX["Nginx<br/>:443 (TLS Let's Encrypt)<br/>:80 redirect"] --> APP
    APP["Next.js<br/>127.0.0.1:3001<br/>PM2 fork 1 instance"] --> DB
    DB[("PostgreSQL 16<br/>localhost:5432")] --> BK
    BK["pg_dump harian<br/>/var/backups/posyandu"] --> RC
    RC["rclone"] --> GD["Google Drive<br/>(akun khusus backup)"]
    APP --> LOG["logs/out.log<br/>logs/error.log"]
```

- App **bind ke `127.0.0.1`** — tidak boleh terbuka langsung ke internet
  (`ecosystem.config.cjs`), hanya lewat Nginx.
- Port default `3001` (dapat diubah via env `PORT`).
- Jendela pemeliharaan: `deploy/nginx-posyandu.conf` + `deploy/maintenance.html`
  (lihat `DEPLOY-UPDATE.md §4`).

### 8.2 Lingkungan pengembangan

- Postgres lokal (`createdb nyawiji`), database uji terpisah `nyawiji_test`.
- `npm run db:seed` (18 Kapanewon + akun DINKES), `npm run db:dev` (data uji).
- Perintah: `npm run dev` (port 3000), `npm run build`, `npm test`, `npm run lint`.

### 8.3 Target server kabupaten

Pola sama, dengan dua perubahan: domain/subdomain resmi kabupaten, dan database
PostgreSQL dipindahkan/dipulihkan dari `pg_dump`. Prosedur: `docs/ded/RUNBOOK-MIGRASI-POSTGRESQL.md`
dan `docs/DEPLOY-BARU.md`.

### 8.4 Variabel lingkungan

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ya | `postgresql://user:pass@host:5432/db?schema=public` |
| `SESSION_SECRET` | ya | acak ≥64 karakter; produksi **gagal start** bila kosong |
| `NEXT_PUBLIC_APP_NAME` | tidak | nama tampilan aplikasi |
| `DINKES_ADMIN_USERNAME` / `DINKES_ADMIN_PASSWORD` | ya | bootstrap super-admin saat DB kosong |
| `POSYANDU_DEFAULT_PASSWORD` / `PUSKESMAS_DEFAULT_PASSWORD` | ya | password default akun baru (wajib berbeda) |
| `PORT` / `HOST` | tidak | default `3001` / `127.0.0.1` |

---

## 9. Daftar API (32 Endpoint)

Semua route di bawah `src/app/api/**`. Kolom **Peran** = pembatas di server.

### Autentikasi & akun

| Metode | Path | Peran | Keterangan |
|---|---|---|---|
| POST | `/api/auth/login` | publik | login staf (username) & kader (cascade posyanduId) |
| POST | `/api/auth/logout` | semua | hapus cookie sesi |
| GET | `/api/auth/me` | semua | identitas sesi berjalan |
| POST | `/api/auth/activate` | publik | aktivasi akun baru (ganti password default) |
| POST | `/api/auth/change-password` | semua | ganti password sendiri (menaikkan `tokenVersion`) |
| POST | `/api/auth/reset-password` | Puskesmas, Dinkes | reset password ke default peran |

### Data wilayah & unit

| Metode | Path | Peran | Keterangan |
|---|---|---|---|
| GET | `/api/lokasi` | publik | daftar Kapanewon/Kalurahan untuk picker login |
| GET | `/api/public/puskesmas` | publik | daftar Puskesmas (login kader) |
| GET | `/api/public/puskesmas/[id]/kalurahan` | publik | Kalurahan dalam Puskesmas |
| GET | `/api/public/puskesmas/[id]/posyandu` | publik | Posyandu dalam Puskesmas |
| GET | `/api/posyandus` | semua | daftar Puskesmas + Posyandu (terfilter peran) |
| POST | `/api/posyandus` | Puskesmas, Dinkes | buat Posyandu + akun kader (transaksi) |
| PATCH | `/api/posyandus/[posyanduId]` | Puskesmas, Dinkes | ubah nama/kalurahan/padukuhan |
| DELETE | `/api/posyandus/[posyanduId]` | Puskesmas, Dinkes | hapus **hanya bila kosong** (jika ada data → `409`) |
| POST | `/api/posyandus/[posyanduId]/status` | Puskesmas, Dinkes | nonaktifkan/aktifkan akun (naikkan `tokenVersion`) |
| GET | `/api/dinkes/puskesmas` | Dinkes | daftar Puskesmas |
| POST | `/api/dinkes/puskesmas` | Dinkes | buat akun Puskesmas |

### Pasien & pengukuran

| Metode | Path | Peran | Keterangan |
|---|---|---|---|
| GET | `/api/patients` | Posyandu, Puskesmas | daftar pasien + status kelengkapan bulan ini |
| POST | `/api/patients` | Posyandu | registrasi pasien; `clientId` idempoten; `409` bila duplikat (kecuali `force`) |
| GET | `/api/patients/[id]` | Posyandu, Puskesmas | detail pasien + riwayat |
| PUT | `/api/patients/[id]` | Posyandu | ubah data pasien |
| DELETE | `/api/patients/[id]` | Posyandu | hapus pasien (cascade pengukuran) |
| POST | `/api/measurements/autosave` | Posyandu | simpan/ubah pengukuran per bulan (idempoten per field) |
| DELETE | `/api/measurements/[id]` | Posyandu | hapus satu pengukuran |

### Statistik & laporan

| Metode | Path | Peran | Keterangan |
|---|---|---|---|
| GET | `/api/stats/coverage` | semua | cakupan/partisipasi per unit per bulan |
| GET | `/api/stats/category-coverage` | semua | cakupan per kategori siklus hidup |
| GET | `/api/stats/outcomes` | semua | klasifikasi hasil pengukuran (normal/abnormal/belum dinilai) |
| GET | `/api/stats/indicator-units` | semua | sebaran indikator per unit |
| GET | `/api/stats/growth` | semua | tren status gizi |
| GET | `/api/stats/growth-units` | semua | status gizi per unit |
| GET | `/api/stats/growth-patients` | Posyandu, Puskesmas | daftar balita berisiko tumbuh (bernama) |
| GET | `/api/stats/weight-progression` | semua | cakupan, N/T, 2T per periode |
| GET | `/api/stats/faltering-patients` | Posyandu, Puskesmas | daftar pasien 2T (bernama) |
| GET | `/api/stats/abnormal-patients` | Posyandu, Puskesmas | daftar pasien indikator abnormal |
| GET | `/api/stats/breastfeeding` | semua | capaian ASI eksklusif |
| GET | `/api/stats/report` | semua | **export Excel** (batas 30 unit / 20.000 baris untuk data per pasien) |

### Administrasi Dinkes

| Metode | Path | Peran | Keterangan |
|---|---|---|---|
| POST | `/api/dinkes/import` | Dinkes | import master wilayah (xlsx/xls/csv ≤5 MB, mendukung `?dry=1`) |
| POST | `/api/dinkes/backfill-growth` | Dinkes | hitung ulang Z-score + N/T + 2T seluruh data |

---

## 10. Keamanan & Privasi

| Kontrol | Detail | Lokasi |
|---|---|---|
| Sesi | JWT HS256, masa 24 jam, cookie `posyandu_session` `HttpOnly` + `SameSite=Lax`; `Secure` hanya bila HTTPS | `src/lib/session.ts` |
| Pencabutan sesi | `tokenVersion` pada `User` dicocokkan tiap request; naik saat ganti/reset password & nonaktif akun | `src/lib/api-auth.ts` |
| Fail-closed scope | sesi POSYANDU/PUSKESMAS tanpa id wilayah → `403`, bukan "semua data" | `src/lib/patient-scope.ts`, `src/lib/api-auth.ts` |
| Otorisasi peran | `requireRole` pada tiap route | `src/lib/api-auth.ts` |
| Verifikasi kepemilikan | Puskesmas hanya boleh menyentuh `healthCenterId`-nya | route posyandu/patients |
| Password | bcrypt, aktivasi wajib ganti pada login pertama, minimal 8 karakter | `src/lib/password.ts` |
| Rate limit | login 20/menit, reset 10/menit (in-memory) | `src/lib/rate-limit.ts` |
| Header keamanan | CSP (Report-Only), HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (kamera hanya `self`) | `next.config.ts` |
| `poweredByHeader` | dimatikan | `next.config.ts` |
| Jaringan | app bind loopback, TLS di Nginx, firewall 80/443 saja | `ecosystem.config.cjs`, Nginx |
| Import aman | batas ukuran 5 MB + validasi ekstensi (pustaka xlsx punya riwayat celah) | `src/app/api/dinkes/import/route.ts:292-300` |

**Rekomendasi penguatan** (belum dikerjakan): naikkan CSP dari Report-Only ke
enforcing; ganti rate-limit in-memory ke Redis bila kelak multi-instance; tambah
`Content-Security-Policy` di level Nginx untuk `/maintenance.html`.

---

## 11. Offline-First & Integritas Data

1. **Antrean lokal** di `localStorage` (`posyandu_offline_sync_queue`) — bukan
   IndexedDB (lihat §14 temuan).
2. **Debounce 600 ms per field**; timeout kirim 10 detik; saat form ditutup dikirim
   `keepalive`.
3. **Kunci dedupe**: `m:<posyanduId>:<patientId>:<YYYY-MM>`; patch dalam bulan yang
   sama digabung.
4. **Registrasi pasien offline** memakai `clientId` (UUID) → retry tidak menduplikasi.
5. **Urutan terjaga**: item yang gagal menahan dirinya dan seluruh antrean di
   belakangnya.
6. **Konflik**: `409` pengukuran = data offline kalah versi → dibuang + dilaporkan ke
   UI (tidak hilang diam-diam); `400/404` = drop permanen; `401/403/429/5xx/jaringan` =
   ditahan untuk dicoba lagi.
7. **Rantai turunan**: mengubah berat pengukuran lama memicu
   `recomputePatientWeightProgression` untuk seluruh rantai pasien.

Konsekuensi operasional penting: **kader dilarang logout saat offline** — antrean
belum terkirim dan hilang bila sesi dihapus/dipindah perangkat.

---

## 12. Operasional

| Aktivitas | Perintah / Berkas |
|---|---|
| Jalankan aplikasi | `pm2 start ecosystem.config.cjs` · `pm2 save` · `pm2 startup` |
| Cek status | `pm2 status`, `pm2 logs posyandu-nyawiji` |
| Update kode (tanpa perubahan schema) | `deploy/DEPLOY-UPDATE.md` Jalur A |
| Update kode (dengan perubahan schema) | `DEPLOY-UPDATE.md` Jalur B (`pm2 stop` → `rm -rf .next` → `db push` → `backfill` → `build` → `start`) |
| Backup | `scripts/backup-db.sh` (pg_dump + gzip, retensi 7 harian + 6 bulanan, upload rclone) |
| Restore | `scripts/restore-db.sh daily:<tanggal> [--from-drive] [--yes]` |
| Jendela pemeliharaan | `deploy/nginx-posyandu.conf` + `deploy/maintenance.html`, toggle `/var/www/maintenance.on` |
| Backup Google Drive | rclone remote `gdrive:posyandu-backup`, config `/root/.config/rclone/rclone.conf` |

**Rencana pemulihan bencana (ringkas):**

1. Pasang ulang VPS (Node 22, PostgreSQL, Nginx, PM2, rclone).
2. `git clone` repo, buat `.env` baru (`SESSION_SECRET` baru).
3. `createdb nyawiji` → jalankan `scripts/restore-db.sh monthly:<tanggal> --from-drive`.
4. `npm ci` → `npm run build` → `pm2 start ecosystem.config.cjs` → `pm2 save`.
5. Pasang ulang Nginx + sertifikat; verifikasi dengan `docs/uat-deploy-checklist.md`.

Catatan: `SESSION_SECRET` baru = semua pengguna login ulang (dampak yang diinginkan,
bukan kerusakan data).

---

## 13. Migrasi Database

Aplikasi semula memakai SQLite (berkas tunggal `prisma/dev.db`), kini
**PostgreSQL**. Alasan: banyak penulis (ratusan posyandu) dan pemisahan database
dari berkas aplikasi.

Perubahan kode yang menyertainya (sudah ada di branch `feat/migrasi-postgresql`):

1. `prisma/schema.prisma` → `provider = "postgresql"`.
2. `src/lib/prisma.ts` → blok `PRAGMA` SQLite dihapus.
3. `src/lib/analytics.ts` → 3 query mentah ditulis ulang (quote identifier,
   `to_char` + `AT TIME ZONE 'Asia/Jakarta'`, parameter `Date`).
4. `scripts/backup-db.sh` / `restore-db.sh` → `pg_dump` / `pg_restore`.
5. `src/lib/analytics.integration.test.ts` → database uji PostgreSQL `nyawiji_test`.

Prosedur pindah data (termasuk skrip impor SQLite → PostgreSQL), jendela
pemeliharaan, verifikasi paritas, dan rollback ada di
**`docs/ded/RUNBOOK-MIGRASI-POSTGRESQL.md`**.

---

## 14. Pengujian & Verifikasi

| Jenis | Cakupan | Perintah |
|---|---|---|
| Unit & fuzz | 194 tes (20 berkas), termasuk fuzz antropometri 5.000 input/acak | `npm test` |
| Integrasi DB | query mentah + agregasi + rantai N/T (PostgreSQL `nyawiji_test`) | `npm test` |
| Lint | ESLint | `npm run lint` |
| Build produksi | `next build` + `prisma generate` | `npm run build` |
| Verifikasi turunan | paritas N/T & 2T | `npm run db:verify-weight` |
| UAT per peran | checklist manual Kader/Puskesmas/Dinkes | `docs/uat-deploy-checklist.md` |

Jalur rilis yang disarankan: lint → test → build → deploy → UAT → pantau log PM2.

---

## 15. Batasan, Temuan & Rekomendasi

### Temuan yang perlu diketahui developer berikutnya

1. **Antrean offline memakai `localStorage`, bukan IndexedDB.** Kode:
   `src/lib/offline-sync.ts` (`localStorage.getItem/setItem`). Beberapa dokumen
   analisis (`PROJECT_POSYANDU/03_OUTPUT/BUSINESS_PROCESS_NARRATIVE.md`,
   `01_DATA_INPUT/edge_cases.md`, `sistem_infrastruktur.md`) menyebut IndexedDB —
   itu **tidak akurat**. Dokumen ini dan `docs/ded/*` mengikuti kode.
   - Risiko: kuota `localStorage` ±5 MB dan hanya menyimpan string.
   - Rekomendasi: bila antrean pernah besar (ratusan entri), pindahkan ke IndexedDB.
2. **Rate limit in-memory.** Tidak berlaku lintas proses/instance. Aman selama 1
   instance PM2; perlu Redis bila diskalakan.
3. **`Measurement` memakai `version` last-write-wins**, bukan merge per field. Dua
   kader mengedit pasien sama → yang lebih baru menang (UI memperingatkan konflik).

### Batasan yang disengaja (dengan jalur peningkatan)

| Batasan | Alasan | Jalur peningkatan |
|---|---|---|
| Status gizi & N/T hanya 0–60 bulan | Permenkes 2/2020 | tambah tabel WHO Reference 2007 untuk 61–83 bulan |
| Export data per pasien maks 30 unit / 20.000 baris | cegah server kehabisan memori | paginasi/streaming bila perlu lebih besar |
| CSP masih Report-Only | hindari memecah aplikasi saat rilis | naikkan ke enforcing setelah pantauan bersih |
| Login kader tanpa username | kader lansia | pertahankan; jangan tambah kolom username kader |
| Database `prisma db push` (belum `migrate deploy`) | kesederhanaan | adopsi `prisma migrate` bila lingkungan bertambah |

### Rekomendasi lanjutan (usulan, belum dikerjakan)

1. **Sanity check nilai ekstrem** — konfirmasi bila BB/TB melonjak tidak wajar antar
   bulan (cegah salah ketik).
2. **Pengingat WhatsApp** jadwal Posyandu untuk menaikkan partisipasi (D/S).
3. **Cetak/bagikan surat rujukan 2T & Bumil KEK** langsung dari aplikasi.
4. **Notifikasi Telegram** untuk kegagalan backup (kode hook sudah tersedia di
   `scripts/backup-db.sh`).
5. **Kurangi data turunan ganda** — kategori umur disimpan sebagai snapshot; audit
   berkala via backfill.

---

## 16. Referensi

| Kebutuhan | Berkas |
|---|---|
| Aliran data (DFD) | `docs/ded/DFD.md` |
| Alur proses & sistem (flowchart) | `docs/ded/FLOWCHART.md` |
| Model data (ERD) | `docs/ded/ERD.md` |
| Migrasi database | `docs/ded/RUNBOOK-MIGRASI-POSTGRESQL.md` |
| Glosarium & aturan domain | `CONTEXT.md` |
| Keputusan arsitektur | `docs/adr/` |
| Deploy baru & update | `docs/DEPLOY-BARU.md`, `DEPLOY-UPDATE.md`, `DEPLOY-VPS.md` |
| Proses bisnis naratif (sumber asal) | `PROJECT_POSYANDU/03_OUTPUT/BUSINESS_PROCESS_NARRATIVE.md` |
| UAT | `docs/uat-deploy-checklist.md` |
| Standar klinis | `docs/growth-antropometri.md`, `docs/adr/0001-*`, `0002-*`, `0003-*`, `0004-*` |
