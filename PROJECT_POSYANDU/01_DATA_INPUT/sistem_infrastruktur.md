# SISTEM & INFRASTRUKTUR TEKNOLOGI INFORMASI POSYANDU DIGITAL (PORTAL NYAWIJI)

## 1. Arsitektur Aktor & Hak Akses Berjenjang (Role-Based Access Control)

| Aktor / Role | Level Institusi | Lingkup Akses Data | Hak & Wewenang |
|---|---|---|---|
| **Kader Posyandu** (`POSYANDU`) | Tingkat Padukuhan / Kalurahan | Terkunci khusus Posyandu miliknya | - Pendaftaran & koreksi data pasien<br>- Pencatatan pengukuran & skrining<br>- Scan & cetak kartu QR pasien<br>- Download data lengkap (Nama & Detail) Excel posyandu |
| **Staf Puskesmas** (`PUSKESMAS`) | Tingkat Kapanewon (Kecamatan) | Seluruh Posyandu binaan dalam wilayah kerjanya | - Pembuatan akun posyandu baru<br>- Reset password kader & aktivasi/nonaktif akun<br>- Mode supervisi "Buka Meja" (Read-Only)<br>- Export data gabungan (maks 30 unit / 20.000 baris) |
| **Admin Dinkes** (`DINKES`) | Tingkat Kabupaten Gunungkidul | Seluruh Kapanewon & Puskesmas se-Kabupaten | - Pendaftaran akun Puskesmas<br>- Impor massal data wilayah (Excel/CSV)<br>- Pemeliharaan & Backfill Growth Engine Z-score<br>- Pemantauan agregat murni (Tanpa Nama Pasien) |

## 2. Model Autentikasi & Keamanan
- **Kader Login Cascade**: Memilih Puskesmas -> Kalurahan -> Posyandu -> Input Password Posyandu (memudahkan kader lansia/tanpa username).
- **Staf/Admin Login**: Menggunakan Username unik (contoh `@pkm_wonosari1`, `dinkes_gk`) + Password terenkripsi.
- **Kebijakan Password Wajib**: Akun baru wajib mengganti default password pada login pertama (minimal 8 karakter).
- **Token Versioning**: Kemampuan mencabut seluruh sesi aktif seketika jika akun dinonaktifkan atau password direset.
- **Fail-Closed Scope Authorization**: Sistem otomatis menolak permintaan data jika token tidak memiliki cakupan wilayah yang sah.

## 3. Infrastruktur & Fitur Teknis Kunci
- **Teknologi**: Next.js (Fullstack), Prisma ORM, Database SQLite/PostgreSQL, Tailwind CSS UI.
- **Offline-First Resilience**: Dukungan Service Worker PWA, IndexedDB local storage queue, client-id deduplication untuk menjamin data tersimpan saat kader bekerja di wilayah blank spot/susah sinyal.
- **Algoritma Pertumbuhan Klinis**:
  - Standar Antropometri Anak sesuai **Permenkes No. 2 Tahun 2020** (Z-Score: BB/U, TB/U, BB/TB, IMT/U) untuk rentang usia 0–60 bulan.
  - Koreksi posisi ukur otomatis: koreksi ±0.7 cm berdasarkan usia (<24 bulan telentang, ≥24 bulan berdiri).
  - Algoritma Deteksi **KMS N/T** (Naik/Tidak Naik) dan peringatan **2T** (Dua kali berturut-turut berat badan tidak naik = indikasi gagal tumbuh/weight faltering).
- **Fast Search & Quick Access**:
  - Penomoran registrasi otomatis berformat hierarkis: `POS-[KODE_POS]-[TAHUN]-[URUT]`.
  - Kartu Identitas Digital dengan Quick Response (QR) Code untuk pencarian kilat via kamera HP kader.
