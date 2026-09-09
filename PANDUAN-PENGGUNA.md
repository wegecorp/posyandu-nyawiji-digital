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

## 4. Install / Simpan Aplikasi di HP Anda

Aplikasi ini bisa "dipasang" seperti aplikasi biasa di layar utama HP. Hasilnya: ada ikon sendiri, terbuka **layar penuh** (tanpa bilah alamat browser), dan lebih cepat dibuka.

### Di mana tombolnya?

- Di **halaman login**: tombol hijau **INSTALL APLIKASI — Simpan di Layar Utama**.
- Setelah masuk akun: ikon **unduh (download)** di bar paling atas aplikasi.
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

- Pemasangan butuh koneksi internet pada langkah pertama (sekali saja). Setelah terpasang, aplikasi tetap bisa dipakai saat sinyal hilang.
- Gunakan browser versi terbaru agar fitur install berfungsi.
- Pada komputer, tombol install tersedia di **Google Chrome / Microsoft Edge**.

---

## 5. Panduan per Jenjang

### 5.1 Kader Posyandu

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

### 5.2 Staf Puskesmas

Puskesmas tidak mencatat pengukuran, tetapi **mengawasi Posyandu binaan** dan mengelola akunnya.

**Di halaman Beranda Anda dapat:**

- Melihat ringkasan jumlah **Posyandu, Pasien, dan Pengukuran** di wilayah Anda.
- Melihat **Akun Posyandu Binaan** (dikelompokkan per Kalurahan) beserta statusnya (Aktif / Menunggu aktivasi).
- **Daftarkan Posyandu**: isi Nama Posyandu, pilih Kalurahan, dan Padukuhan. Sistem otomatis membuat akun posyandu + username untuk kader (kader memilih Puskesmas → Kalurahan → Posyandu saat login).
- **Edit** data posyandu (nama, kalurahan, padukuhan). Kode posyandu tidak bisa diubah.
- **Reset password** (ikon kunci): mengembalikan password posyandu ke password default. Kader harus aktivasi ulang saat login berikutnya. Biasanya dilakukan bila kader lupa password.
- **Buka Meja**: melihat langsung isi data pelayanan sebuah posyandu dalam mode **read-only** (hanya lihat, tidak bisa ubah/hapus).

**Export Rekap Wilayah:** unduh data seluruh pengukuran puskesmas Anda dalam bentuk file Excel untuk keperluan pelaporan.

### 5.3 Dinas Kesehatan

Dinkes adalah pusat kendali tingkat kabupaten: membuat akun Puskesmas dan memantau seluruh Posyandu.

**Di halaman Beranda Anda dapat:**

- Melihat ringkasan **Puskesmas, Posyandu, Pasien, dan total pengukuran** se-kabupaten.
- **Daftarkan Puskesmas**: isi Nama Puskesmas dan pilih Kapanewon. Sistem otomatis membuat username staf (contoh `@pkm_wonosari1`). Sampaikan username + password default ke pengelola Puskesmas.
- **Import Posyandu massal** dari file Excel/CSV dengan kolom: NAMA PUSKESMAS, NAMA KALURAHAN, NAMA PADUKUHAN, NAMA POSYANDU. Gunakan tombol **Analisis Dulu** untuk melihat laporan sebelum benar-benar di-import.
- **Buka / Reset Pass** untuk posyandu di bawah setiap puskesmas (bisa turun ke mode lihat data posyandu).
- Melihat daftar akun yang masih **Menunggu aktivasi**.

**Export Se-Kabupaten:** unduh seluruh data pengukuran di kabupaten dalam bentuk file Excel.

---

## 6. Data yang Dicatat & Kelompok Sasaran

Form pengukuran menyesuaikan kolomnya **secara otomatis** dengan umur pasien (dihitung dari tanggal lahir). Artinya: kolom yang tampil untuk balita belum tentu sama dengan untuk dewasa. Kelompok sasaran ditentukan aplikasi sendiri — Anda tidak perlu memilih manual.

### 6.1 Kelompok sasaran & pengelompokannya

| Kelompok (label di aplikasi) | Rentang umur | Ukuran khusus yang ikut muncul |
|---|---|---|
| **Balita (<5 th)** | 0–4 tahun | Lingkar Kepala (LK); tinggi memakai **"Panjang / TB"** |
| **Anak (5–9 th)** | 5–9 tahun | — |
| **Remaja (10–17 th)** | 10–17 tahun | Tekanan Darah (Tensi) |
| **Dewasa / Lansia** | 18 tahun ke atas | Tekanan Darah (Tensi) |
| **Ibu Hamil (Bumil)** | semua umur | Usia Kehamilan + Tekanan Darah |

> **Ibu Hamil (Bumil)** bukan ditentukan dari umur, melainkan **dicentang saat mendaftarkan pasien** (khusus pasien perempuan). Centang ini mengesampingkan kelompok berdasarkan umur.

### 6.2 Rincian data yang dicatat

| Data | Satuan | Dicatat untuk | Wajib? |
|---|---|---|---|
| Berat Badan (BB) | kg | Semua kelompok | **Wajib** |
| Tinggi / Panjang Badan (TB/PB) | cm | Semua kelompok | **Wajib** |
| Indeks Massa Tubuh (IMT) | kg/m² | Semua kelompok | Otomatis dihitung dari BB & TB |
| Lingkar Kepala (LK) | cm | Balita | Opsional |
| Lingkar Lengan Atas (LiLA) | cm | Semua kelompok | Opsional |
| Lingkar Perut | cm | Semua kelompok | Opsional |
| Tekanan Darah (Tensi) | mmHg | Remaja, Dewasa/Lansia, Ibu Hamil | Opsional |
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
| Tensi Tinggi (hipertensi) | Tekanan darah | 140/90 mmHg atau lebih (Remaja, Dewasa/Lansia, Ibu Hamil) |
| Anemia (HB rendah) | Hemoglobin | Balita < 11,0 · Anak < 11,5 · Remaja < 12,0 · Ibu Hamil < 11,0 · Dewasa: pria < 13,0 / wanita < 12,0 g/dL |
| Gula Darah Tinggi | Gula darah | 126 mg/dL atau lebih |
| Kolesterol Tinggi | Kolesterol | 200 mg/dL atau lebih |
| Asam Urat Tinggi | Asam urat | Pria > 7,0 · Wanita > 6,0 mg/dL |
| Skrining Mata / Telinga | Skrining | Dipilih **"Tidak Normal"** |

> Ambang ini hanya **penanda awal** dari aplikasi untuk kewaspadaan. Diagnosis dan tindak lanjut tetap dilakukan **tenaga kesehatan (Nakes/Puskesmas)**.

---

## 7. Fitur Bersama

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

## 8. Tips Umum

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
