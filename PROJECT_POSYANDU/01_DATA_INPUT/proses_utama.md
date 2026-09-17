# DAFTAR PROSES BISNIS UTAMA, MANAJEMEN, DAN PENDUKUNG

## 1. Kategori: UTAMA (Core Service Processes)

### Proses 1: Pelayanan Kesehatan Bayi dan Balita (0–59 Bulan & Apras)
- **Tujuan**: Memantau pertumbuhan dan perkembangan fisik anak, deteksi dini stunting, wasting, underweight, weight faltering (2T), status ASI eksklusif, dan skrining gejala TB.
- **Trigger**: Kedatangan bayi/balita didampingi orang tua/pengasuh pada hari buka Posyandu.
- **Aktor Utama**: Orang Tua/Pengasuh, Kader Pendaftaran, Kader Penimbangan/Pengukuran, Kader Pencatatan, Tenaga Kesehatan (Bidan Desa/Perawat Puskesmas).
- **Frekuensi**: Bulanan per Posyandu (sesuai jadwal hari buka).
- **Output**: Data antropometri (BB, PB/TB, LK), Koreksi posisi ukur, Z-Score (BB/U, TB/U, BB/TB, IMT/U), Status KMS (N/T, 2T), Status ASI Eksklusif, Skrining TB, Surat Rujukan/Konseling jika berisiko.

### Proses 2: Pelayanan Kesehatan Ibu Hamil (Bumil)
- **Tujuan**: Deteksi dini faktor risiko kehamilan (KEK, anemia, hipertensi gestasional), pemantauan pertambahan berat badan, dan skrining TB maternal.
- **Trigger**: Kedatangan ibu hamil pada sesi Posyandu.
- **Aktor Utama**: Ibu Hamil, Kader Pendaftaran, Bidan Desa / Kader Posyandu, Tenaga Kesehatan Puskesmas.
- **Frekuensi**: Bulanan selama masa kehamilan.
- **Output**: Data BB, TB, LiLA, Usia Kehamilan, Tensi, Skrining TB, Status KEK, Rekomendasi/Rujukan ANC Terpadu ke Puskesmas.

### Proses 3: Pelayanan Kesehatan Usia Sekolah dan Remaja (7–17 Tahun)
- **Tujuan**: Skrining status gizi, deteksi dini anemia (terutama remaja putri), hipertensi dini, dan gangguan indra penglihatan/pendengaran.
- **Trigger**: Kedatangan remaja pada posyandu remaja / hari buka posyandu siklus hidup.
- **Aktor Utama**: Remaja, Kader Posyandu, Petugas Kesehatan Puskesmas.
- **Frekuensi**: Bulanan atau triwulanan sesuai jadwal Posyandu Remaja.
- **Output**: Data BB, TB, IMT, Lingkar Perut, Tekanan Darah, Skrining Indra, HB/Anemia, Edukasi Gizi & TTD Remaja Putri.

### Proses 4: Pelayanan Kesehatan Usia Produktif dan Lansia (Dewasa & Lansia)
- **Tujuan**: Deteksi dini faktor risiko Penyakit Tidak Menular (PTM) seperti hipertensi, diabetes melitus, hiperkolesterol, hiperurisemia, obesitas sentral, dan skrining TB/indra.
- **Trigger**: Warga usia produktif (18-59 tahun) atau lansia (60+ tahun) hadir di Posyandu.
- **Aktor Utama**: Warga Dewasa/Lansia, Kader Posyandu, Tenaga Kesehatan Puskesmas.
- **Frekuensi**: Bulanan.
- **Output**: Data Antropometri Dewasa (BB, TB, IMT, LP), Tekanan Darah, Nilai Lab Sederhana (GDS, Kolesterol, Asam Urat), Skrining TB/Indra, Rujukan PTM ke Puskesmas.

---

## 2. Kategori: MANAJEMEN (Management Processes)

### Proses 5: Validasi, Sinkronisasi Offline-First, dan Rekapitulasi Pelayanan Posyandu
- **Tujuan**: Memastikan integritas data hari buka Posyandu, rekonsiliasi antrean offline lokal ke server pusat, dan pembuatan rekapitulasi data layanan posyandu.
- **Trigger**: Penutupan sesi pelayanan hari buka Posyandu oleh kader.
- **Aktor Utama**: Kader Posyandu, Sistem Aplikasi Portal Nyawiji (Offline-Sync Engine).
- **Frekuensi**: Selesai setiap hari buka Posyandu (bulanan).
- **Output**: Seluruh data pasien tersinkronisasi tanpa konflik, Laporan Rekapitulasi Pelayanan Posyandu (Excel: Ringkasan, Anggota, Detail, Berisiko).

### Proses 6: Pembinaan Wilayah, Pengawasan Pelayanan, dan Pengelolaan Akun oleh Puskesmas
- **Tujuan**: Supervisi kualitas data posyandu binaan, manajemen akun posyandu (registrasi, reset password, aktivasi/nonaktif), pemantauan indikator risiko wilayah, dan persiapan Lokakarya Mini.
- **Trigger**: Kebutuhan pengawasan bulanan, penerimaan laporan posyandu, permohonan reset password dari kader, atau evaluasi program.
- **Aktor Utama**: Petugas/Admin Puskesmas, Bidan Koordinator, Sistem Portal Nyawiji.
- **Frekuensi**: Harian/Bulanan/Sesuai kebutuhan supervisi.
- **Output**: Akun posyandu terkelola dengan aman, audit data via "Buka Meja" (read-only), Rekap Wilayah Puskesmas (Excel teragregasi maks 30 unit/20.000 baris).

---

## 3. Kategori: PENDUKUNG (Support Processes)

### Proses 7: Tata Kelola Master Data Wilayah, Agregasi Kebijakan, dan Evaluasi Kesehatan oleh Dinas Kesehatan
- **Tujuan**: Pengelolaan master data kewilayahan (Kapanewon, Kalurahan, Padukuhan, Puskesmas, Posyandu), manajemen akun Puskesmas, perhitungan ulang data analitik (Backfill engine), dan pemantauan agregat kesehatan kabupaten tanpa melanggar privasi nama pasien.
- **Trigger**: Perencanaan program tahunan, penambahan/perubahan struktur wilayah, evaluasi capaian stunting/PTM kabupaten.
- **Aktor Utama**: Super Admin Dinkes Kabupaten Gunungkidul, Kepala Seksi Kesehatan Masyarakat.
- **Frekuensi**: Bulanan, Semesteran, Tahunan, atau saat ada restrukturisasi wilayah.
- **Output**: Master data wilayah terstandarisasi, akun Puskesmas aktif, laporan agregat kabupaten, data historis ter-backfill sesuai standar Permenkes 2/2020.
