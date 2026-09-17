# LAPORAN TEMUAN, ASUMSI & REKOMENDASI ANALISIS PROSES BISNIS
**Sistem Digitalisasi Posyandu (Portal Nyawiji) - Dinas Kesehatan Kabupaten Gunungkidul**

---

## 1. Ringkasan Eksekutif Hasil Analisis

Berdasarkan analisis komprehensif terhadap arsitektur sistem, basis data, dokumentasi domain (ADR), panduan teknis, dan alur operasional lapangan aplikasi Portal Nyawiji, proses bisnis digitalisasi posyandu telah berhasil dipetakan secara end-to-end ke dalam **7 Proses Bisnis Terstandarisasi** dengan total **70 Aktivitas Terinci**.

Pemetaan ini mengintegrasikan standar nasional **5 Langkah Posyandu Integrasi Layanan Primer (ILP)** Kemenkes RI, **Permenkes No. 2 Tahun 2020** tentang Standar Antropometri Anak, serta prinsip arsitektur perangkat lunak **Offline-First & Privacy by Design**.

---

## 2. Inconsistencies & Rekonsiliasi yang Ditemukan

| No | Topik / Area | Kondisi Awal / Potensi Inkonsistensi | Solusi / Rekonsiliasi Terapan |
|---|---|---|---|
| 1 | **Rentang Usia Kategori Balita & Apras** | Kategori `BALITA_APRAS` mencakup anak usia 6 bulan hingga <84 bulan (6 tahun 11 bulan), namun tabel antropometri Permenkes 2/2020 hanya berlaku hingga 60 bulan (5 tahun 0 bulan). | Sistem tetap mewajibkan pengisian BB dan TB untuk anak usia 61–83 bulan, namun nilai Z-score dan status KMS N/T dikosongkan (`null`). Ini telah diakomodasi secara konsisten dalam proses bisnis Proses 1 dan dokumen ADR-0001 & ADR-0004. |
| 2 | **Model Autentikasi Kader vs Staf Instansi** | Kader posyandu di pedesaan sering kesulitan mengingat username yang rumit, sementara staf Puskesmas dan Dinkes membutuhkan username unik untuk akuntabilitas. | Menerapkan mekanisme login *Cascade Wilayah* (Puskesmas -> Kalurahan -> Posyandu -> Password) khusus kader, sedangkan peran Puskesmas dan Dinkes menggunakan format username instansi standar (misal `@pkm_wonosari1`). |
| 3 | **Batasan Privasi Data Pasien antar Jenjang** | Potensi pelanggaran privasi data medis jika tingkat kabupaten (Dinkes) dapat melihat rekam jejak nama per pasien. | Menerapkan pembatasan *Fail-Closed Scope Authorization*: Kader dan Puskesmas dapat melihat identitas per pasien (untuk pembinaan langsung), sedangkan Dinkes hanya menerima data agregat murni per wilayah tanpa nama pasien. |
| 4 | **Perhitungan Berat Badan N/T dan 2T** | Risiko kesalahan penentuan status 2T bila anak absen pada bulan tertentu atau baru pertama kali ditimbang. | Penentuan status N/T mensyaratkan perbandingan dengan sesi pengukuran valid terdekat sebelumnya. Bila baru pertama kali datang, nilai N/T berstatus `null` (belum dapat dinilai). |

---

## 3. Asumsi-Asumsi Analisis (Assumptions Made)

1. **Jadwal Pelayanan Posyandu**: Dilaksanakan secara periodik satu bulan sekali per posyandu dengan basis penanggalan sesi kanonik bulanan (`YYYY-MM-01`).
2. **Ketersediaan Alat Ukur Standar**: Setiap posyandu diasumsikan memiliki alat ukur antropometri terstandarisasi Kemenkes (timbangan digital bayi/dewasa, stadiometer, infantometer, pita LiLA) dan alat POCT sederhana yang disediakan oleh Puskesmas pembina.
3. **Ketersediaan Tenaga Kesehatan Pendamping**: Hari buka posyandu diasumsikan dihadiri minimal satu Tenaga Kesehatan (Bidan Desa atau Perawat Pembina) dari Puskesmas untuk memvalidasi kasus berisiko, memberikan imunisasi, dan menerbitkan rujukan.
4. **Kapasitas Perangkat Kader**: Kader posyandu menggunakan setidaknya satu *smartphone* atau tablet Android berbasis peramban modern (Chrome/Edge) dengan kemampuan PWA dan penyimpanan lokal IndexedDB.

---

## 4. Klarifikasi & Rekomendasi Lanjutan (Recommendations)

### Rekomendasi Teknis & Fungsional
1. **Penguatan Validasi Rentang Input (Sanity Checks)**:
   - Menambahkan peringatan konfirmasi jika input BB atau TB melonjak secara tidak wajar dibandingkan bulan lalu (misal: BB naik >5 kg dalam 1 bulan pada bayi) untuk mencegah salah ketik angka nol/koma oleh kader.
2. **Standardisasi Format Ekspor Rujukan Medis**:
   - Menyediakan fitur cetak instan / bagikan via WhatsApp untuk *Surat Rujukan Medis Balita 2T & Ibu Hamil KEK* langsung dari aplikasi agar koordinasi dengan poli rujukan Puskesmas semakin cepat.
3. **Integrasi WhatsApp Reminder**:
   - Mengembangkan modul pengingat otomatis jadwal posyandu kepada orang tua balita dan ibu hamil untuk meningkatkan angka kehadiran partisipasi (D/S).

---

*Dokumen ini disusun sebagai lampiran telaah proses bisnis pengajuan resmi aplikasi ke Dinas Kesehatan Kabupaten Gunungkidul.*
