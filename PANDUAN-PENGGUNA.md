# Panduan Pengguna PORTAL NYAWIJI

Panduan untuk pengguna aplikasi (kader Posyandu, petugas Puskesmas, dan Dinas Kesehatan). Aplikasi ini mencatat data dan pengukuran kesehatan warga secara digital, dari tingkat Posyandu sampai Dinas Kesehatan.

Dokumen ini juga memuat **Skenario Hari Buka Posyandu** yang memadankan alur kerja nyata (5 Langkah Posyandu ILP) dengan langkah-langkah di dalam aplikasi.

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Cara Login](#2-cara-login)
3. [Aktivasi Akun Pertama Kali (Ganti Password)](#3-aktivasi-akun-pertama-kali-ganti-password)
4. [Install / Simpan Aplikasi di HP](#4-install--simpan-aplikasi-di-hp)
5. [Panduan per Jenjang](#5-panduan-per-jenjang)
   - [5.1 Kader Posyandu](#51-kader-posyandu)
   - [5.2 Staf Puskesmas](#52-staf-puskesmas)
   - [5.3 Dinas Kesehatan](#53-dinas-kesehatan)
6. [Data yang Dicatat & Kelompok Sasaran](#6-data-yang-dicatat--kelompok-sasaran)
7. [Fitur Bersama](#7-fitur-bersama)
8. [Alur & Kepemilikan Data](#8-alur--kepemilikan-data)
9. [Tips Umum](#9-tips-umum)
10. [Skenario Hari Buka Posyandu (5 Langkah ILP)](#10-skenario-hari-buka-posyandu-5-langkah-ilp)

---

## 1. Gambaran Umum

Aplikasi dipakai oleh 3 jenjang yang saling terhubung:

```
Dinas Kesehatan (Kabupaten)
      |
      v
Puskesmas (tingkat Kapanewon)
      |
      v
Posyandu (tingkat Kalurahan / Padukuhan)
```

| Jenjang | Siapa yang memakai | Tugas utama |
|---|---|---|
| **Posyandu** | Kader | Mencatat pasien & pengukuran saat hari pelayanan |
| **Puskesmas** | Staf/Admin Puskesmas | Mengawasi dan mengelola akun Posyandu binaannya |
| **Dinkes** | Admin Dinkes | Membuat akun Puskesmas dan memantau seluruh Posyandu di kabupaten |

Tata urut pembuatan akun (dari atas ke bawah):

- Akun **Puskesmas** dibuat oleh **Dinas Kesehatan**.
- Akun **Posyandu** dibuat oleh **Puskesmas** (atau lewat import massal oleh Dinas Kesehatan).
- Semua akun baru memakai **password default** dan **wajib diganti password** saat pertama kali masuk.

### Aturan privasi data pasien

- **Kader Posyandu** hanya melihat data pasien **posyandunya sendiri**, dan boleh mengunduh **data anggotanya sendiri** (nama, nomor registrasi, dan rincian pengukuran) lewat **Rekap Ringkas → Excel** — lihat bagian 7.
- **Puskesmas** melihat data pasien di posyandu binaannya (termasuk nama, untuk pembinaan).
- **Dinas Kesehatan** hanya melihat **agregat per wilayah** (jumlah, persentase) tanpa nama pasien, untuk perencanaan dan evaluasi.
- Rekap untuk **Puskesmas** dan **Dinas Kesehatan** berisi **agregat** (ringkasan per unit), **bukan** baris per pasien.
- Aturan lengkap ada pada halaman **Kebijakan Privasi** dan **Syarat & Ketentuan** di aplikasi (tautan tersedia di halaman login).

---

## 2. Cara Login

Buka aplikasi di browser (HP/laptop) lalu pilih tab sesuai jenjang Anda.

![Halaman login — pilihan tab Kader Posyandu / Puskesmas / Dinkes](docs/panduan/01-login.png)

### a. Kader Posyandu (login tanpa username)

Pilih tab **Kader Posyandu**, lalu ikuti langkah berurutan:

1. **Pilih Puskesmas** tempat posyandu Anda bernaung.
2. **Pilih Kalurahan**.
3. **Pilih Posyandu** Anda.
4. Masukkan **password** posyandu.
5. Klik tombol masuk.

> Password awal posyandu diberikan oleh Puskesmas/Dinas Kesehatan. Saat pertama kali masuk, aplikasi akan meminta Anda mengganti password (lihat bagian 3).

### b. Staf Puskesmas & Dinas Kesehatan (login dengan username)

Pilih tab **Puskesmas / Dinkes**, lalu isi:

- **Username** dan **Password**
- Puskesmas: username otomatis sesuai nama puskesmas, contoh `pkm_wonosari1`.
- Dinkes: username khusus admin, contoh `dinkes_gk`.

Jika Anda lupa password, hubungi jenjang di atas Anda (Posyandu ke Puskesmas, Puskesmas ke Dinkes) untuk direset.

---

## 3. Aktivasi Akun Pertama Kali (Ganti Password)

Saat login pertama memakai password default, aplikasi otomatis menampilkan layar **Aktivasi Akun**:

1. Masukkan **Password Baru**.
2. Ketik ulang pada kolom **Konfirmasi Password Baru**.
3. Klik **Aktifkan & Masuk**.

Ketentuan password:

- Minimal **8 karakter**.
- Tidak boleh sama dengan password default.
- Ingat dan jaga kerahasiaannya.

Setelah aktif, Anda bisa mengganti password kapan saja lewat ikon akun di pojok kanan atas (Detail Akun Sesi) → **Ubah Password Saya**.

---

## 4. Install / Simpan Aplikasi di HP

Aplikasi ini bisa "dipasang" seperti aplikasi biasa di layar utama HP. Hasilnya: ada ikon sendiri, terbuka **layar penuh** (tanpa bilah alamat browser), dan lebih cepat dibuka.

### Di mana tombolnya?

- Di **halaman login**: tombol hijau **INSTALL APLIKASI — Simpan di Layar Utama**.
- Setelah masuk akun: tombol **Install Aplikasi** di bar paling atas aplikasi.
- Tombol **hilang otomatis** bila aplikasi sudah terpasang di perangkat yang sedang dipakai.

### Bagaimana cara kerjanya di tiap HP/browser?

| Perangkat / browser | Yang terjadi saat tombol ditekan |
|---|---|
| **HP Android — Chrome / Edge / Samsung Internet** | Muncul dialog resmi "Instal aplikasi" → ketuk **Instal**. |
| **iPhone / iPad — Safari** | Apple tidak mengizinkan dialog otomatis. Tombol menampilkan panduan manual. |
| **Komputer — Chrome / Edge** | Mengarahkan memakai ikon "Instal" di bilah alamat / menu browser. |
| **Browser lain yang belum mendukung** | Muncul pemberitahuan: gunakan Chrome/Edge, atau pasang manual lewat menu browser. |

### Kalau tidak muncul dialog otomatis (panduan manual singkat)

**iPhone / iPad (Safari):**
1. Ketuk tombol **Bagikan** (kotak dengan panah ke atas) di bawah Safari.
2. Pilih **"Tambahkan ke Layar Utama" (Add to Home Screen)**.
3. Ketuk **Tambah**. Ikon aplikasi muncul di layar utama.

**HP Android (mis. Firefox):**
1. Ketuk menu **titik tiga** di pojok kanan atas browser.
2. Pilih **"Instal aplikasi"** atau **"Tambahkan ke Layar Utama"**.
3. Ketuk **Instal / Tambahkan**.

Catatan:

- Pemasangan butuh koneksi internet pada langkah pertama (sekali saja).
- Gunakan browser versi terbaru agar fitur install berfungsi.
- Pada komputer, tombol install tersedia di **Google Chrome / Microsoft Edge**.

---

## 5. Panduan per Jenjang

### 5.1 Kader Posyandu

Tugas utama kader adalah pelayanan hari buka posyandu: mendaftarkan pasien dan mencatat pengukuran.

#### Halaman Beranda

Setelah masuk, kader melihat **beranda** posyandu:

- **Bar atas**: nama posyandu, tombol **Install Aplikasi**, dan ikon **Rekap Ringkas**.
- **Tab Beranda / Analisis**: berpindah antara daftar pasien dan grafik ringkasan.
- **Kotak Cari nama pasien**: menyaring daftar secara langsung.
- **Filter status**: **Semua**, **Belum**, **Selesai** — untuk melihat siapa yang belum diukur.
- **Chip kategori usia**: Semua Usia, Bayi (0-5 bln), Balita & Apras (6 bln-6 th), Remaja (7-17 th), Dewasa (18-59 th), Lansia (60+ th), Ibu Hamil.

![Daftar pasien — pencarian, filter status, chip usia, dan kartu pasien](docs/panduan/02-daftar-pasien.png)

#### Arti badge pada kartu pasien

| Badge | Artinya |
|---|---|
| **Sudah diukur** | BB & TB hari ini sudah lengkap |
| **Diukur sebagian** | Baru sebagian terisi (BB/TB belum lengkap) |
| **Belum diukur hari ini** | Belum ada pengukuran pada hari ini |
| **Belum ditimbang bulan ini** | Balita yang belum ditimbang pada bulan berjalan |
| **2T — perlu rujuk** | Dua kali berturut-turut berat badan tidak naik |

#### Mendaftarkan Pasien Baru

1. Klik tombol hijau **PASIEN BARU** (atau **Daftarkan Pasien Baru** bila daftar masih kosong).
2. Isi minimal **Nama Lengkap** dan **Tanggal Lahir** (tidak perlu NIK).
3. Pilih **Jenis Kelamin** (Laki-laki / Perempuan). Centang **Pasien Ibu Hamil (Bumil)** bila pasien sedang hamil.
4. Data tambahan (wali, alamat, nomor HP) boleh diisi bila ada melalui tombol **Isi (opsional)**.
5. Klik **Daftar & Langsung Ukur**. Anda bisa langsung mengukur pasien tersebut.

> Aplikasi menampilkan perkiraan **usia** dan **kelompok sasaran** begitu tanggal lahir diisi. Bila ada pasien mirip yang sudah terdaftar, aplikasi akan menanyakan konfirmasi agar tidak terjadi data ganda.

#### Mencatat Pengukuran

1. Pilih pasien dari daftar (atau gunakan kotak cari).
2. Pada tab **Input Hari Ini**, isi kolom sesuai kelompok usia (lihat bagian 6).

   | Kolom | Untuk siapa |
   |---|---|
   | Berat Badan (BB) dan Tinggi/Panjang Badan (TB) | Semua pasien (wajib) |
   | Posisi Ukur (Telentang / Berdiri) | Bayi & Balita/Apras — menentukan koreksi tinggi ±0,7 cm |
   | Lingkar Kepala (LK) | Bayi & Balita/Apras |
   | ASI Eksklusif | Bayi (0-5 bln) — berhenti setelah dijawab Tidak |
   | Lingkar Lengan Atas (LiLA), Lingkar Perut | Semua pasien (opsional) |
   | Tekanan Darah (Tensi) | Remaja, Dewasa, Lansia, dan Ibu Hamil |
   | Usia Kehamilan | Ibu Hamil |
   | Gula darah, kolesterol, asam urat, HB | Sesuai kebutuhan pelayanan |
   | Skrining mata/telinga, Catatan | Sesuai kebutuhan |

![Input / Edit Sesi — kolom ukur menyesuaikan usia, tersimpan otomatis](docs/panduan/03-input-hari-ini.png)

3. Nilai **tersimpan otomatis** — tidak ada tombol simpan. Tunggu tanda **Tersimpan Otomatis** setelah selesai mengisi.
4. Bila seluruh ukuran wajib lengkap, status pasien menjadi **Selesai**. Klik **Selesai — Kembali ke Daftar** untuk mengukur pasien berikutnya.

> **BB dan TB wajib diisi** agar pasien dianggap "selesai diukur". IMT dihitung otomatis dari keduanya.

#### Melihat Hasil & Riwayat

- **Status gizi otomatis**: begitu BB, TB, dan tanggal lahir lengkap, aplikasi menampilkan status **BB/U, TB/U, dan BB/TB** beserta nilai Z (standar Permenkes 2/2020).
- **Tab Riwayat**: menampilkan seluruh pengukuran pasien per tanggal, lengkap dengan tanda **BB N/T** (naik / tidak naik) dan peringatan **2T — perlu rujuk**.
- **Kurva KMS — Berat Badan / Umur** (khusus Balita): garis tebal = berat anak; pita abu/kuning = batas normal. Garis di bawah ambang merah menandakan berat sangat kurang.

#### Kartu QR & Pindai Pasien

Setiap pasien punya **kode QR** berisi nomor registrasinya. Berguna untuk **pencarian kilat** saat hari pelayanan — tidak perlu mengetik nama.

**Membuat / melihat kartu QR:**

1. Pada kartu pasien, ketuk ikon **QR** di sisi kanan.
2. Muncul **Kartu QR Pasien** berisi nama, nomor registrasi, dan gambar QR.
3. Tunjukkan QR ini ke petugas, atau simpan tangkapan layar untuk dicetak/dibagikan ke warga.

![Kartu QR pasien — nama, nomor registrasi, dan kode QR](docs/panduan/05-kartu-qr.png)

**Memindai QR untuk mencari pasien:**

1. Ketuk ikon **QR** di **bar atas** aplikasi, atau tombol QR di samping **kotak pencarian**.
2. Arahkan kamera ke kode QR pada kartu pasien / HP warga.
3. Bila cocok, aplikasi **langsung membuka** pasien tersebut. Bila tidak ditemukan di posyandu ini, nomor registrasi otomatis masuk ke kotak pencarian.

> Pindai QR butuh izin kamera browser. Bila kamera tidak bisa dipakai, cari pasien dengan mengetik nama atau nomor registrasi seperti biasa.

#### Edit / Koreksi Data Pasien

Salah ketik nama, tanggal lahir, atau data lain? Kader dapat memperbaikinya tanpa membuat pasien baru.

1. Pada kartu pasien, ketuk ikon **pensil** (Edit).
2. Perbaiki kolom yang perlu: nama, tanggal lahir, jenis kelamin, status ibu hamil (Bumil), nama wali, alamat, atau nomor HP.
3. Simpan. Daftar dan pengukuran pasien ikut memakai data terbaru.

> Perubahan **tanggal lahir** memengaruhi perhitungan **usia**, **kelompok sasaran**, dan **status gizi**. Perhatikan peringatan data ganda saat menyimpan agar tidak ada pasien tercatat dua kali.

### 5.2 Staf Puskesmas

Puskesmas tidak mencatat pengukuran, tetapi **mengawasi Posyandu binaan** dan mengelola akunnya.

**Di halaman Beranda Anda dapat:**

- Melihat ringkasan jumlah **Posyandu, Pasien, dan Pengukuran** di wilayah Anda.
- Melihat **Akun Posyandu Binaan** (dikelompokkan per Kalurahan) beserta statusnya (Aktif / Menunggu aktivasi). Daftar panjang dipotong per halaman; gunakan tombol **Sebelumnya / Berikutnya** dan kotak pencarian.
- **Daftarkan Posyandu**: isi Nama Posyandu, pilih Kalurahan, dan Padukuhan. Sistem otomatis membuat akun posyandu untuk kader (kader memilih Puskesmas → Kalurahan → Posyandu saat login).
- **Edit** data posyandu (nama, kalurahan, padukuhan). Kode posyandu tidak bisa diubah.
- **Reset password** (ikon kunci): mengembalikan password posyandu ke password default. Kader harus aktivasi ulang saat login berikutnya. Biasanya dilakukan bila kader lupa password.
- **Buka Meja**: melihat langsung isi data pelayanan sebuah posyandu dalam mode **read-only** (hanya lihat, tidak bisa ubah/hapus).

**Rekap Ringkas:** tombol **Rekap Wilayah** membuka ringkasan agregat seluruh posyandu binaan (lihat bagian 7).

Di tab **Analisis**, Puskesmas dapat melihat tren partisipasi, peringkat posyandu, distribusi status gizi, progres berat badan (N/T & 2T), dan temuan per indikator. Detail per wilayah dapat dibuka sampai daftar pasien (nama) per posyandu.

### 5.3 Dinas Kesehatan

Dinkes adalah pusat kendali tingkat kabupaten: membuat akun Puskesmas dan memantau seluruh Posyandu.

**Di halaman Beranda Anda dapat:**

- Melihat ringkasan **Puskesmas, Posyandu, Pasien, dan total pengukuran** se-kabupaten.
- **Daftarkan Puskesmas**: isi Nama Puskesmas dan pilih Kapanewon. Sistem otomatis membuat username staf (contoh `@pkm_wonosari1`). Sampaikan username + password default ke pengelola Puskesmas.
- **Import Posyandu massal** dari file Excel/CSV dengan kolom: NAMA PUSKESMAS, NAMA KALURAHAN, NAMA PADUKUHAN, NAMA POSYANDU. Gunakan tombol **Analisis Dulu** untuk melihat laporan sebelum benar-benar di-import.
- **Buka / Reset Pass** untuk posyandu di bawah setiap puskesmas (bisa turun ke mode lihat data posyandu). Daftar posyandu per puskesmas dibatasi; klik **Tampilkan semua** untuk membuka seluruhnya.
- Melihat daftar akun yang masih **Menunggu aktivasi**.

**Rekap Ringkas:** tombol **Rekap Kabupaten** membuka ringkasan agregat se-kabupaten (lihat bagian 7).

> **Catatan privasi:** Dinkes hanya melihat **agregat per wilayah** (per puskesmas dan per posyandu), bukan nama per pasien. Detail sampai tingkat pasien hanya untuk Posyandu dan Puskesmas.

---

## 6. Data yang Dicatat & Kelompok Sasaran

Form pengukuran menyesuaikan kolomnya **secara otomatis** dengan umur pasien (dihitung dari tanggal lahir). Kelompok sasaran ditentukan aplikasi sendiri — Anda tidak perlu memilih manual.

### 6.1 Kelompok sasaran & pengelompokannya

| Kelompok (label di aplikasi) | Rentang umur | Ukuran khusus yang ikut muncul |
|---|---|---|
| **Bayi (0-5 bln)** | 0–5 bulan | Lingkar Kepala (LK); **"Panjang / TB"**; **ASI Eksklusif** |
| **Balita & Apras (6 bln-6 th)** | 6 bulan–6 tahun 11 bulan | Lingkar Kepala (LK); **"Panjang / TB"**; status gizi (0–60 bln) |
| **Remaja (7-17 th)** | 7–17 tahun | Tekanan Darah (Tensi) |
| **Dewasa (18-59 th)** | 18–59 tahun | Tekanan Darah (Tensi) |
| **Lansia (60+ th)** | 60 tahun ke atas | Tekanan Darah (Tensi) |
| **Ibu Hamil (Bumil)** | semua umur | Usia Kehamilan + Tekanan Darah |

> Batas kelompok memakai **bulan penuh**: 6 bulan 1 hari sudah masuk **Balita & Apras** (bukan Bayi lagi); tepat 7 tahun masuk **Remaja**; tepat 60 tahun masuk **Lansia**.
>
> **Ibu Hamil (Bumil)** bukan ditentukan dari umur, melainkan **dicentang saat mendaftarkan pasien** (khusus pasien perempuan). Centang ini mengesampingkan kelompok berdasarkan umur.

### 6.2 Rincian data yang dicatat

| Data | Satuan | Dicatat untuk | Wajib? |
|---|---|---|---|
| Berat Badan (BB) | kg | Semua kelompok | **Wajib** |
| Tinggi / Panjang Badan (TB/PB) | cm | Semua kelompok | **Wajib** |
| Posisi Ukur (Telentang / Berdiri) | — | Bayi & Balita/Apras | Opsional (default otomatis menurut umur) |
| Indeks Massa Tubuh (IMT) | kg/m² | Semua kelompok | Otomatis dihitung dari BB & TB |
| Lingkar Kepala (LK) | cm | Bayi & Balita/Apras | Opsional |
| ASI Eksklusif | Ya / Tidak | Bayi (0–5 bln) | Opsional — berhenti ditanya setelah dijawab **Tidak** |
| Lingkar Lengan Atas (LiLA) | cm | Semua kelompok | Opsional |
| Lingkar Perut | cm | Semua kelompok | Opsional |
| Tekanan Darah (Tensi) | mmHg | Remaja, Dewasa, Lansia, Ibu Hamil | Opsional |
| Usia Kehamilan | minggu | Ibu Hamil | Opsional |
| Gula Darah (GDS) | mg/dL | Semua kelompok (jika alat tersedia) | Opsional |
| Kolesterol Total | mg/dL | Semua kelompok (jika alat tersedia) | Opsional |
| Asam Urat | mg/dL | Semua kelompok (jika alat tersedia) | Opsional |
| Hemoglobin (HB) | g/dL | Semua kelompok (jika alat tersedia) | Opsional |
| Skrining Mata | Normal / Tidak Normal | Semua kelompok | Opsional |
| Skrining Telinga | Normal / Tidak Normal | Semua kelompok | Opsional |
| Catatan | teks bebas | Semua kelompok | Opsional |

Keterangan singkat tiap bagian:

- **Ukur Fisik Utama (BB & TB)** — wajib untuk semua pasien. Bila dua kolom ini kosong, pasien berstatus **"Belum diukur"**. IMT dihitung otomatis dari keduanya.
- **Posisi Ukur (Balita)** — pilih **Telentang** bila diukur kurang dari 24 bulan, atau **Berdiri** bila 24 bulan ke atas. Aplikasi memakai posisi ini untuk **koreksi tinggi ±0,7 cm** agar status gizi (TB/U, BB/TB) tepat. Default mengikuti umur; ubah bila cara ukur di lapangan berbeda.
- **Ukur Khusus Balita** — Lingkar Kepala memantau pertumbuhan otak balita.
- **Ukur Tambahan** — LiLA & Lingkar Perut (opsional), sering dipakai untuk sasaran dewasa/menyusui.
- **Ukur Khusus Remaja / Dewasa-Lansia & Pemeriksaan Ibu Hamil** — Tensi (dan Usia Kehamilan untuk bumil).
- **Skrining Indra** — hasil pemeriksaan mata & telinga; pilih **Normal** atau **Tidak Normal**.
- **Laboratorium Sederhana** — GDS, Kolesterol, Asam Urat, HB. Isi hanya bila alat tes tersedia di posyandu.
- **Catatan** — tulis keluhan, pemberian vitamin, atau rujukan. Pilih penulis **Kader** atau **Nakes**.

### 6.3 Nilai yang disorot sebagai "Tidak Normal"

Menu **Analisis** otomatis menghitung hasil dan menyorot nilai yang patut diwaspadai. Ambang yang dipakai aplikasi:

| Indikator | Dihitung dari | Ambang "tidak normal" |
|---|---|---|
| Tensi Tinggi (hipertensi) | Tekanan darah | 140/90 mmHg atau lebih (Remaja, Dewasa, Lansia, Ibu Hamil) |
| Anemia (HB rendah) | Hemoglobin | Balita < 11,0 · Anak < 11,5 · Remaja < 12,0 · Ibu Hamil < 11,0 · Dewasa: pria < 13,0 / wanita < 12,0 g/dL |
| Gula Darah Tinggi | Gula darah | 126 mg/dL atau lebih |
| Kolesterol Tinggi | Kolesterol | 200 mg/dL atau lebih |
| Asam Urat Tinggi | Asam urat | Pria > 7,0 · Wanita > 6,0 mg/dL |
| Skrining Mata / Telinga | Skrining | Dipilih **"Tidak Normal"** |

> Ambang ini hanya **penanda awal** dari aplikasi untuk kewaspadaan. Diagnosis dan tindak lanjut tetap dilakukan **tenaga kesehatan (Nakes/Puskesmas)**.

### 6.4 Progres berat badan: Naik / Tidak Naik (N/T) dan 2T

- **N (Naik)** — berat badan hari ini lebih besar dari pengukuran sebelumnya.
- **T (Tidak Naik)** — berat badan sama atau lebih kecil dari pengukuran sebelumnya.
- **2T** — dua kali berturut-turut **Tidak Naik** → ditandai **"2T — perlu rujuk"** dan perlu ditindaklanjuti/dirujuk ke Puskesmas.

---

## 7. Fitur Bersama

### Rekap Ringkas

Ringkasan pelayanan untuk **semua kelompok umur**, diunduh sebagai berkas **Excel**. Isi berkas **berbeda menurut jenjang**:

| Jenjang | Isi berkas Excel | Identitas pasien? |
|---|---|---|
| **Kader Posyandu** | `Ringkasan`, daftar posyandu, **`Daftar Anggota`** (1 baris per pasien), **`Detail Pengukuran`** (1 baris per kunjungan) | **Ya** — nama & nomor registrasi milik posyandu sendiri |
| **Puskesmas** | `Ringkasan` + satu baris per posyandu binaan | Tidak — agregat |
| **Dinkes** | `Ringkasan` global kabupaten + satu baris per puskesmas | Tidak — agregat |

> Berkas untuk **kader memuat data individu** (nama, nomor registrasi, BB/TB, status gizi, N/T, 2T, hasil lab, catatan) karena hanya untuk posyandu sendiri. Berkas **Puskesmas & Dinkes tetap agregat** — lihat [Aturan privasi data pasien](#aturan-privasi-data-pasien).

Isi rekap antara lain: jumlah terdaftar & terukur, status gizi balita, **N / T / 2T**, serta temuan per indikator (hipertensi, anemia, gula darah, kolesterol, asam urat, skrining mata/telinga).

Cara memakai:

1. Buka **Rekap Ringkas** (ikon berkas di bar atas, atau tombol **Rekap Wilayah / Rekap Kabupaten** di beranda).
2. Pilih **periode** (maksimal **12 bulan** untuk kader/Puskesmas, **24 bulan** untuk Dinkes).
3. Periksa ringkasan yang tampil.
4. Klik **Unduh Rekap Excel**, lalu simpan atau kirim ke jenjang di atasnya.

![Rekap Ringkas — pilih periode lalu Unduh Rekap Excel](docs/panduan/04-rekap-excel.png)

### Menu Analisis (tab di bagian atas)

Semua jenjang dapat melihat grafik dan ringkasan. Gunakan pemilih periode (6/12/24 bulan) untuk mengatur rentang waktu.

| Menu | Posyandu (kader) | Puskesmas | Dinkes |
|---|---|---|---|
| Tren partisipasi (terdaftar vs terukur per bulan) | Milik sendiri | Wilayah puskesmas | Kabupaten |
| Ranking partisipasi | - | Ranking antar-posyandu | Ranking antar-puskesmas |
| Distribusi status gizi balita (BB/U, TB/U, BB/TB) | Ya | Ya | Ya (agregat) |
| Progres berat badan (N/T & 2T) | Ya | Ya | Ya (agregat) |
| Distribusi hasil Normal / Tidak Normal | Ya | Ya | Ya |
| Temuan Tidak Normal per indikator | Ya | Ya | Ya |
| Detail per wilayah | Daftar pasien sendiri | Posyandu → daftar pasien | Puskesmas → Posyandu (**tanpa nama**) |

Cara membaca:

- **Klik** baris/segmen grafik untuk membuka detail.
- **Kader**: langsung melihat daftar pasien (nama).
- **Puskesmas**: memilih posyandu lebih dulu, lalu melihat daftar pasien (nama).
- **Dinkes**: melihat peringkat per puskesmas lalu per posyandu; tanpa nama pasien.
- Daftar yang panjang memakai tombol **Muat lebih banyak** dan kotak **cari** (nama/no. registrasi untuk daftar pasien; nama unit untuk daftar wilayah).

Contoh temuan yang dipantau: **tensi tinggi (hipertensi), anemia (HB rendah), gula darah tinggi, kolesterol tinggi, asam urat tinggi, serta skrining mata/telinga tidak normal.**

---

## 8. Alur & Kepemilikan Data

Bagian ini merangkum perjalanan data dari Posyandu sampai Dinas Kesehatan — untuk menyamakan pemahaman **kader** dan **Puskesmas**.

### 8.1 Alur data

| Tahap | Pelaku | Yang terjadi |
|---|---|---|
| 1. Pendaftaran | Kader | Pasien didaftarkan (nama + tanggal lahir), dapat **kartu QR** |
| 2. Pengukuran | Kader | BB/TB/LK/tensi/lab dicatat; **tersimpan otomatis** |
| 3. Penilaian | Aplikasi | Usia, status gizi, **N/T**, dan **2T** dihitung otomatis |
| 4. Rekap | Kader | Unduh **Excel** (termasuk data anggota) → setor ke Puskesmas |
| 5. Pembinaan | Puskesmas | Pantau posyandu binaan, **buka meja** (mode lihat), reset akun kader |
| 6. Perencanaan | Dinkes | Pantau **agregat** kabupaten per puskesmas |

### 8.2 Siapa melihat apa

| Data | Kader Posyandu | Puskesmas | Dinkes |
|---|---|---|---|
| Nama & nomor registrasi pasien | Posyandu sendiri | Posyandu binaan | Tidak (agregat) |
| Detail pengukuran per pasien | Ya | Ya (mode lihat) | Tidak |
| Unduh data individu (Excel) | Ya (posyandu sendiri) | Tidak | Tidak |
| Rekap agregat per unit | Ya | Ya | Ya |
| Kelola / reset akun posyandu | Tidak | Ya | Ya |
| Buat akun puskesmas | Tidak | Tidak | Ya |

> Puskesmas dapat **membuka meja** untuk melihat data posyandu binaan, tetapi **tidak bisa mengubah atau menghapus** data — hak input tetap milik kader. Rincian privasi ada di [Aturan privasi data pasien](#aturan-privasi-data-pasien).

---

## 9. Tips Umum

1. **Ganti password default segera** saat login pertama.
2. **Jangan bagikan akun** — setiap posyandu/puskesmas punya akun sendiri.
3. **Pastikan BB dan TB terisi** agar pasien tercatat "selesai diukur".
4. **Utamakan koneksi online.** Ini cara paling aman. Bila benar-benar tanpa sinyal:
   - Data tersimpan sementara di perangkat (tanda **"Tersimpan Offline"**).
   - **Jangan logout** sebelum data tersinkron.
   - Saat kembali online, data **tersinkron otomatis** (lihat pemberitahuan "menunggu sinkron ke server").
   - **Periksa di Rekap Ringkas** bahwa semua sudah masuk sebelum disetorkan.
5. Bila terjadi **bentrok data** (dua perangkat mengisi bersamaan), aplikasi menampilkan peringatan "Data Bentrok — Muat Ulang". Muat ulang halaman untuk mengambil data terbaru. Sebaiknya gunakan **satu HP utama** untuk input.
6. Nomor registrasi, kode posyandu, dan kode puskesmas **dibuat otomatis oleh sistem** — tidak perlu dihafal, cukup pakai pencarian nama.
7. Untuk bantuan/lupa password: hubungi jenjang di atas Anda.
8. **Manfaatkan kartu QR.** Simpan/minta warga membawa kartu QR pasien agar saat hari buka cukup **memindai**, tidak perlu mengetik nama.
9. **Salah input data? Edit, jangan daftar ulang.** Gunakan ikon **pensil** pada kartu pasien (bagian 5.1) supaya tidak terjadi data ganda.
10. **Data berhak dikoreksi.** Subjek data/wali dapat meminta perbaikan lewat Posyandu/Puskesmas — lihat **Kebijakan Privasi**.

---

## 10. Skenario Hari Buka Posyandu (5 Langkah ILP)

Bagian ini menjelaskan **tujuan** dan **cara** memakai aplikasi pada hari buka posyandu. Alurnya mengikuti **5 Langkah Posyandu Integrasi Layanan Primer (ILP)**: Pendaftaran → Penimbangan & Pengukuran → Pencatatan & Pemeriksaan → Pelayanan Kesehatan & Penyuluhan → Validasi & Sinkronisasi Data.

> Istilah "5 Meja" (pendaftaran, penimbangan, pengisian KMS, penyuluhan, pelayanan kesehatan) adalah sebutan lama. Sesudah ILP, langkahnya diperluas dan mencakup **semua sasaran** (ibu hamil, bayi, balita, remaja, dewasa, lansia), bukan hanya balita.

### 10.1 Ringkasan cepat

| Langkah ILP | Kegiatan di meja | Di aplikasi |
|---|---|---|
| 1. Pendaftaran | Peserta mendaftar | **Daftarkan Pasien Baru** (nama + tanggal lahir; centang **Bumil** bila hamil) |
| 2. Penimbangan & Pengukuran | Timbang BB, ukur TB/PB, LK, tensi, LiLA | Alat ukur fisik (di luar aplikasi) |
| 3. Pencatatan & Pemeriksaan | Catat hasil & skrining | Tab **Input Hari Ini**: isi BB/TB/LK/tensi/lab/skrinning/catatan |
| 4. Pelayanan Kesehatan & Penyuluhan | Nakes: imunisasi, vitamin, rujukan; kader: penyuluhan | Isi kolom **Catatan** (sumber Kader/Nakes); tandai **2T — perlu rujuk** |
| 5. Validasi & Sinkronisasi Data | Rapikan & serahkan rekap | Pastikan **online**, antrean sinkron kosong, lalu **Rekap Ringkas → Unduh Excel** → setor ke Puskesmas |

### 10.2 Langkah rinci

**Langkah 1 — Pendaftaran**
1. Buka beranda Posyandu (pastikan sudah login).
2. Untuk peserta baru, klik **PASIEN BARU**, isi **Nama Lengkap** dan **Tanggal Lahir**.
3. Pilih **Jenis Kelamin**; centang **Pasien Ibu Hamil (Bumil)** bila perlu.
4. Data tambahan (wali/alamat/HP) diisi melalui **Isi (opsional)** bila ada.
5. Klik **Daftar & Langsung Ukur**. Peserta lama cukup dicari namanya di kotak pencarian, atau **pindai kartu QR** miliknya (lihat bagian 5.1) agar langsung terbuka.

**Langkah 2 — Penimbangan & Pengukuran**
1. Lakukan penimbangan/pengukuran sesuai jenis sasaran (BB, TB/PB, LK, LiLA, lingkar perut, tensi).
2. Catat dulu pada lembar/form yang tersedia, lalu lanjut ke Langkah 3.

**Langkah 3 — Pencatatan & Pemeriksaan**
1. Pilih nama peserta di aplikasi, buka tab **Input Hari Ini**.
2. Isi kolom yang muncul otomatis sesuai usia (lihat bagian 6.2). Untuk balita, pastikan **BB** dan **TB** terisi, dan periksa **Posisi Ukur** (Telentang/Berdiri).
3. Isi hasil skrining dan pemeriksaan lain bila ada. Nilai **tersimpan otomatis** — tidak ada tombol simpan.
4. Perhatikan badge pada kartu peserta:
   - **2T — perlu rujuk** → segera diarahkan pada Langkah 4.
   - **Belum ditimbang bulan ini** → pastikan peserta benar-benar ditimbang.
5. Klik **Selesai — Kembali ke Daftar** bila peserta ini sudah lengkap, lalu lanjut peserta berikutnya.

**Langkah 4 — Pelayanan Kesehatan & Penyuluhan**
1. Tenaga kesehatan memberikan imunisasi, vitamin, pemeriksaan, atau obat.
2. Bila ada rujukan atau keluhan, tulis di kolom **Catatan** dan pilih sumber **Kader** atau **Nakes**.
3. Untuk peserta ber-**2T**, koordinasikan rujuk ke Puskesmas.

**Langkah 5 — Validasi & Sinkronisasi Data**
1. Pastikan perangkat terhubung **internet (online)**. Bila sebelumnya sempat luring, tunggu sampai tidak ada lagi pemberitahuan "menunggu sinkron ke server".
2. Buka **Rekap Ringkas**, pilih periode (bulan ini).
3. Periksa ringkasan: jumlah terdaftar, terukur, N/T, 2T, dan temuan. Cocokkan dengan catatan hari itu.
4. Klik **Unduh Rekap Excel**, lalu setorkan ke Puskesmas sesuai jalur yang berlaku. Berkas kader memuat **Daftar Anggota** & **Detail Pengukuran** (lihat bagian 7).

### 10.3 Catatan perlengkapan & perangkat

- **Gunakan satu HP/tablet utama** untuk input. Akun Posyandu bersifat bersama, sehingga bila dua perangkat menginput peserta yang sama secara bersamaan dapat muncul peringatan **"Data Bentrok"**.
- Bila tersedia lebih dari satu perangkat, atur pembagian peserta (mis. per RT) agar tidak ada peserta yang diinput dua kali.
- Bila lokasi kurang sinyal, tetap **utamakan** mencari titik yang ada koneksi. Fitur luring hanya cadangan: data akan tersinkron otomatis saat kembali online — **jangan logout** sebelum itu.

### 10.4 Sasaran non-bayi/balita (remaja, dewasa, lansia, ibu hamil)

Alur 5 Langkah yang sama berlaku untuk semua sasaran. Yang membedakan hanya kolom pengukuran:

- **Remaja, Dewasa & Lansia:** tekanan darah (dan lab sederhana bila alat tersedia) serta skrining mata/telinga.
- **Ibu Hamil:** tekanan darah, usia kehamilan, LiLA.

Status "2T" dan kurva KMS hanya berlaku untuk **Bayi & Balita/Apras** (karena berbasis berat/umur). Untuk sasaran lain, perhatikan temuan **Tidak Normal** pada menu Analisis.

### 10.5 Rujukan sumber

- Dinas Kesehatan Kota Semarang, Puskesmas Genuk — *Integrasi Layanan Primer (ILP) Posyandu*: `dinkes.semarangkota.go.id/genuk/post/1288`.
- Desa Klampok — *5 Langkah Posyandu ILP*: `klampok.id/blog/2025/06/15/5-langkah-posyandu-ilp/`.

---

Dokumen ini untuk pengguna aplikasi. Untuk informasi teknis pengembangan, lihat `README.md`.
