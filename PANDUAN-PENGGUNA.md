# Panduan Pengguna POSYANDU NYAWIJI

Panduan singkat untuk pengguna aplikasi (kader, petugas Puskesmas, dan Dinas Kesehatan). Aplikasi ini digunakan untuk mencatat data dan pengukuran kesehatan warga secara digital, mulai dari tingkat Posyandu sampai ke Dinas Kesehatan.

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
| **Dinas Kesehatan** | Admin Dinkes | Membuat akun Puskesmas dan memantau seluruh Posyandu di kabupaten |

Tata urut pembuatan akun (dari atas ke bawah):

- Akun **Puskesmas** dibuat oleh **Dinas Kesehatan**.
- Akun **Posyandu** dibuat oleh **Puskesmas** (atau lewat import massal oleh Dinas Kesehatan).
- Semua akun baru memakai **password default** dan **wajib diganti password** saat pertama kali masuk.

---

## 2. Cara Login

Buka aplikasi di browser (HP/laptop) lalu pilih tab sesuai jenjang Anda.

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

## 4. Panduan per Jenjang

### 4.1 Kader Posyandu

Tugas utama kader adalah pelayanan hari buka posyandu: mendaftarkan pasien baru dan mencatat pengukuran.

**Mendaftarkan Pasien Baru**

1. Klik tombol hijau **PASIEN BARU** (atau **Daftarkan Pasien Baru** bila daftar masih kosong).
2. Isi minimal **Nama Lengkap** dan **Tanggal Lahir** (tidak perlu NIK).
3. Pilih **Jenis Kelamin** (L/P). Centang **Ibu Hamil (Bumil)** bila pasien sedang hamil.
4. Data tambahan (wali, alamat, nomor HP) boleh diisi bila ada.
5. Simpan. Anda bisa langsung mengukur pasien tersebut.

> Bila ada pasien mirip yang sudah terdaftar, aplikasi akan menanyakan konfirmasi agar tidak terjadi data ganda.

**Mencatat Pengukuran (Penimbangan / Pengukuran Fisik)**

1. Pilih pasien dari daftar (atau pindai QR-nya).
2. Pada tab **Input Hari Ini**, isi kolom sesuai kelompok usia:

| Kolom | Untuk siapa |
|---|---|
| Berat Badan (BB) dan Tinggi/Panjang Badan (TB) | Semua pasien (wajib) |
| Lingkar Kepala (LK) | Balita |
| Lingkar Lengan Atas (LiLA), Lingkar Perut | Semua pasien (opsional) |
| Tekanan Darah (Tensi) | Remaja, Dewasa/Lansia, dan Ibu Hamil |
| Usia Kehamilan | Ibu Hamil |
| Gula darah, kolesterol, asam urat, HB | Sesuai kebutuhan pelayanan |
| Skrining mata/telinga, Catatan | Sesuai kebutuhan |

3. Nilai **tersimpan otomatis** — tidak ada tombol simpan. Tunggu tanda **Tersimpan Otomatis** setelah selesai mengisi.
4. Bila seluruh ukuran wajib lengkap, status pasien menjadi **Selesai**. Klik **Selesai — Kembali ke Daftar** bila ingin mengukur pasien berikutnya.
5. Riwayat pengukuran pasien bisa dilihat pada tab **Riwayat**.

**Catatan soal BB dan TB:** kedua nilai ini wajib diisi agar pasien dianggap "selesai diukur".

**Tidak ada sinyal / bekerja luring?**

Aplikasi tetap bisa dipakai. Data tersimpan dulu di perangkat (tampil **Tersimpan Offline**) dan **tersinkron otomatis** begitu internet kembali normal. Jangan keluar akun sebelum data tersinkron bila bisa.

### 4.2 Staf Puskesmas

Puskesmas tidak mencatat pengukuran, tetapi **mengawasi Posyandu binaan** dan mengelola akunnya.

**Di halaman Beranda Anda dapat:**

- Melihat ringkasan jumlah **Posyandu, Pasien, dan Pengukuran** di wilayah Anda.
- Melihat **Akun Posyandu Binaan** (dikelompokkan per Kalurahan) beserta statusnya (Aktif / Menunggu aktivasi).
- **Daftarkan Posyandu**: isi Nama Posyandu, pilih Kalurahan, dan Padukuhan. Sistem otomatis membuat akun posyandu + username untuk kader (kader memilih Puskesmas → Kalurahan → Posyandu saat login).
- **Edit** data posyandu (nama, kalurahan, padukuhan). Kode posyandu tidak bisa diubah.
- **Reset password** (ikon kunci): mengembalikan password posyandu ke password default. Kader harus aktivasi ulang saat login berikutnya. Biasanya dilakukan bila kader lupa password.
- **Buka Meja**: melihat langsung isi data pelayanan sebuah posyandu dalam mode **read-only** (hanya lihat, tidak bisa ubah/hapus).

**Export Rekap Wilayah:** unduh data seluruh pengukuran puskesmas Anda dalam bentuk file Excel untuk keperluan pelaporan.

### 4.3 Dinas Kesehatan

Dinkes adalah pusat kendali tingkat kabupaten: membuat akun Puskesmas dan memantau seluruh Posyandu.

**Di halaman Beranda Anda dapat:**

- Melihat ringkasan **Puskesmas, Posyandu, Pasien, dan total pengukuran** se-kabupaten.
- **Daftarkan Puskesmas**: isi Nama Puskesmas dan pilih Kapanewon. Sistem otomatis membuat username staf (contoh `@pkm_wonosari1`). Sampaikan username + password default ke pengelola Puskesmas.
- **Import Posyandu massal** dari file Excel/CSV dengan kolom: NAMA PUSKESMAS, NAMA KALURAHAN, NAMA PADUKUHAN, NAMA POSYANDU. Gunakan tombol **Analisis Dulu** untuk melihat laporan sebelum benar-benar di-import.
- **Buka / Reset Pass** untuk posyandu di bawah setiap puskesmas (bisa turun ke mode lihat data posyandu).
- Melihat daftar akun yang masih **Menunggu aktivasi**.

**Export Se-Kabupaten:** unduh seluruh data pengukuran di kabupaten dalam bentuk file Excel.

---

## 5. Fitur Bersama

### Kartu QR Pasien

- Setiap pasien memiliki **QR Code** berisi nomor registrasi.
- **Lihat QR:** dari kartu pasien atau halaman pengukuran, tekan ikon QR untuk menampilkan kartu QR pasien. Tunjukkan ke meja kader lain untuk pencarian cepat.
- **Pindai QR:** tekan tombol **Scan QR** di pojok atas. Arahkan kamera ke kartu QR pasien — data pasien langsung terbuka. (Perlu izin kamera.)

### Export Excel (Rekap)

- **Kader Posyandu:** mengunduh data rekap posyandu sendiri untuk disetorkan ke Puskesmas.
- **Puskesmas:** rekap seluruh posyandu binaan.
- **Dinkes:** rekap se-kabupaten.

### Menu Analisis (tab di bagian bawah)

Semua jenjang bisa melihat grafik dan ringkasan:

| Menu | Posyandu | Puskesmas | Dinkes |
|---|---|---|---|
| Tren partisipasi (terdaftar vs terukur per bulan) | Milik sendiri | Wilayah puskesmas | Kabupaten |
| Ranking partisipasi | - | Ranking antar-posyandu | Ranking antar-puskesmas (bisa klik untuk masuk ke ranking posyandunya) |
| Distribusi hasil Normal / Tidak Normal | Ya | Ya | Ya |

Contoh hasil yang dipantau: **Tensi tinggi (hipertensi), anemia (HB rendah), gula darah tinggi, kolesterol tinggi, asam urat tinggi, serta temuan skrining mata/telinga tidak normal.**

Gunakan pemilih periode (6/12/24 bulan) untuk mengatur rentang waktu grafik.

---

## 6. Tips Umum

1. **Ganti password default segera** saat login pertama.
2. **Jangan bagikan akun** — setiap posyandu/puskesmas punya akun sendiri.
3. **Pastikan BB dan TB terisi** agar pasien tercatat "selesai diukur".
4. **Periksa status tersimpan** ("Tersimpan Otomatis" / "Tersimpan Offline") sebelum menutup aplikasi.
5. Saat bekerja **tanpa sinyal**, tetap bisa mencatat; data akan tersinkron otomatis setelah online.
6. Bila terjadi **bentrok data** (dua perangkat mengisi bersamaan), aplikasi menampilkan peringatan "Data Bentrok — Muat Ulang". Muat ulang halaman untuk mengambil data terbaru.
7. Nomor registrasi, kode posyandu, dan kode puskesmas **dibuat otomatis oleh sistem** — tidak perlu dihafal, cukup pakai QR atau pencarian nama.
8. Untuk bantuan/lupa password: hubungi jenjang di atas Anda.

---

Dokumen ini untuk pengguna aplikasi. Untuk informasi teknis pengembangan, lihat `README.md`.
