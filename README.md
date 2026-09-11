# 🏥 POSYANDU NYAWIJI

Aplikasi web modern untuk digitalisasi pencatatan, pemantauan kesehatan balita & ibu hamil, serta manajemen pelayanan Posyandu, Puskesmas, hingga Dinas Kesehatan.

---

## 🚀 Fitur Utama

- 👶 **Manajemen Pasien**: Pencatatan data balita dan ibu hamil secara terstruktur.
- 📏 **Pencatatan Pengukuran**: Catat Berat Badan (BB), Tinggi/Panjang Badan (TB/PB), Lingkar Kepala, LiLA, Tensi, & Usia Kehamilan.
- 📱 **Sistem QR Code**: Scan & cetak QR Code pasien untuk pencarian data instan saat hari pelayanan.
- 👥 **Multi-Role User**:
- **DINKES**: Pemantauan data kesehatan tingkat kabupaten/kota.
- **PUSKESMAS**: Pengawasan & manajemen Posyandu di wilayah kerja kecamatan/kapanewon.
- **POSYANDU**: Operasional kader untuk pencatatan rutin pasien & pelayanan bulanan.
- 🔑 **Kredensial**:
  - Staf Puskesmas login dengan **username otomatis** dari nama puskesmas (mis. `pkm_semanu1`, `pkm_wonosari2`) + **password default puskesmas** (`PUSKESMAS_DEFAULT_PASSWORD`).
  - Kader Posyandu login via cascade (Puskesmas → Kalurahan → Posyandu) tanpa username, memakai **password default posyandu** (`POSYANDU_DEFAULT_PASSWORD`) lalu wajib aktivasi/ganti password saat login pertama.
  - Penulisan angka romawi dinormalisasi otomatis: `Ii` → `II`, `Iii` → `III`.
- 📊 **Ekspor & Impor Excel**: Kemudahan pengolahan data & pelaporan via file `.xlsx`.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Database & ORM**: [Prisma](https://www.prisma.io/) + SQLite
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Utilities**: QR Code Generator & Scanner, Excel (`xlsx`)

---

## 💻 Cara Menjalankan Project

### 1. Prasyarat
Pastikan [Node.js](https://nodejs.org/) (v18+) dan `npm` sudah terinstal di komputer kamu.

### 2. Clone & Install Dependency
```bash
git clone <URL_REPOSITORY_GITHUB_KAMU>
cd posyandu_digital
npm install
```

### 3. Setup Environment (.env)
Salin contoh lalu isi nilainya:
```bash
cp .env.example .env
```
```env
DATABASE_URL="file:./dev.db?connection_limit=1"
NEXT_PUBLIC_APP_NAME="POSYANDU NYAWIJI"
SESSION_SECRET="<string acak panjang, 64+ karakter>"
DINKES_ADMIN_USERNAME="dinkes_gk"
DINKES_ADMIN_PASSWORD="<password admin kuat>"
POSYANDU_DEFAULT_PASSWORD="<password kader kuat>"
PUSKESMAS_DEFAULT_PASSWORD="<password staf kuat, beda dari kader>"
```

> **Wajib ganti semua password** sebelum deploy ke VPS. Bila env kosong, aplikasi
> memakai password acak (akun tidak bisa dipakai login) sampai diisi.

### 4. Setup Database Prisma
Jalankan perintah berikut untuk membuat database SQLite lokal:
```bash
npx prisma db push
npm run db:seed        # seed 18 Kapanewon + akun DINKES (tidak menimpa password lama)
npm run db:dev         # (opsional) data uji: 1 Puskesmas + beberapa Posyandu
```

### 5. Jalankan Development Server
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 📁 Struktur Folder Utama

```text
├── app/              # Halaman & API Routes (Next.js App Router)
├── components/       # Komponen UI Reusable (Modal, Form, Navbar, dll)
├── lib/              # Konfigurasi Prisma Client & Helper Function
├── prisma/           # Schema Database & SQLite File
└── public/           # File Statis & Aset
```

---

## 📝 Lisensi

Dipublikasikan di bawah lisensi Open Source. Bebas dikembangkan untuk mendukung pelayanan kesehatan masyarakat.