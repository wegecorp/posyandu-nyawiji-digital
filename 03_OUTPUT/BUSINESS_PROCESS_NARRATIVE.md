# DOKUMENTASI RESMI PROSES BISNIS APLIKASI DIGITALISASI POSYANDU (PORTAL NYAWIJI)

## Informasi Umum
- **Nama Aplikasi**: Portal Nyawiji (Sistem Informasi Digitalisasi Posyandu & Pemantauan Kesehatan Siklus Hidup)
- **Instansi / OPD Pengampu**: Dinas Kesehatan Kabupaten Gunungkidul
- **Lokasi Implementasi**: Seluruh Kapanewon (18 Kecamatan), Kalurahan, Padukuhan, dan Unit Posyandu se-Kabupaten Gunungkidul
- **Tanggal Analisis**: 17 September 2026
- **Total Proses Terpetakan**: 7 Proses Bisnis (4 Proses Utama Layanan Primer, 2 Proses Manajemen, 1 Proses Pendukung)
- **Total Aktivitas Terstandarisasi**: 70 Aktivitas Terinci (10 aktivitas per proses bisnis)

---

## 1. Pelayanan Kesehatan Bayi dan Balita (0–59 Bulan & Apras)

### Ringkasan
- **Tujuan**: Memantau pertumbuhan dan perkembangan fisik balita secara berkala, mendeteksi secara dini indikasi gagal tumbuh (*weight faltering* / 2T), gizi buruk (*wasting*), stunting (*under-height*), memantau capaian ASI eksklusif, serta skrining risiko tuberkulosis (TB).
- **Pemicu/Trigger**: Kedatangan bayi/balita didampingi orang tua/pengasuh pada hari buka Posyandu bulanan.
- **Sasaran Peserta**: Bayi (0–5 bulan) dan Balita/Anak Pra-Sekolah (6–59 bulan, serta pemantauan lanjutan hingga 83 bulan).
- **Frekuensi**: 1 kali per bulan (sesi bulanan berkanonik `YYYY-MM-01`).
- **Output Utama**:
  - Rekam data antropometri lengkap: Berat Badan (BB), Panjang/Tinggi Badan (PB/TB) dengan koreksi posisi telentang/berdiri (±0,7 cm), Lingkar Kepala (LK), dan Lingkar Lengan Atas (LiLA).
  - Status Gizi Z-Score Standar Permenkes No. 2 Tahun 2020: BB/U (*severely underweight/underweight/normal/risk of overweight*), TB/U (*severely stunted/stunted/normal/tall*), BB/TB (*severely wasted/wasted/normal/possible risk of overweight/overweight/obese*), dan IMT/U.
  - Status Progres Kenaikan Berat Badan KMS: Naik (**N**) atau Tidak Naik (**T**), serta peringatan dini **2T** (dua kali berturut-turut berat badan tidak naik) sebagai indikasi wajib rujuk.
  - Status pemantauan ASI Eksklusif (bayi 0–5 bulan).
  - Status skrining risiko gejala TB anak.
  - Kartu QR Pasien dan rujukan medis Puskesmas bagi anak dengan temuan klinis abnormal.

### Alur Proses (Flow)

1. **Kedatangan & Penerimaan Balita**
   - **Aktor**: Orang Tua / Pengasuh & Balita
   - **Aktivitas**: Orang tua membawa balita ke lokasi Posyandu pada jadwal hari buka layanan.
   - **Output**: Kehadiran balita tercatat di antrean pendaftaran.
   - **BPMN**: `Start Event`

2. **Verifikasi & Identifikasi Peserta (Langkah 1 ILP - Pendaftaran)**
   - **Aktor**: Kader Pendaftaran
   - **Input**: Kartu QR Pasien fisik/layar HP, atau Buku KIA, atau nama lengkap & tanggal lahir balita.
   - **Aktivitas**: Memindai kode QR via kamera aplikasi Portal Nyawiji untuk membuka rekam medis secara kilat, atau mencari nama balita. Bila peserta baru, kader menginput nama lengkap, tanggal lahir, jenis kelamin, dan nama wali.
   - **Output**: Data balita teridentifikasi dan status pendaftaran aktif pada sesi bulan berjalan.
   - **BPMN**: `Task`

3. **Penimbangan & Pengukuran Fisik (Langkah 2 ILP - Penimbangan & Pengukuran)**
   - **Aktor**: Kader Penimbangan & Pengukuran
   - **Input**: Timbangan bayi/dacin/digital terkalibrasi, papan ukur panjang badan (*infantometer/baby length board*), alat ukur tinggi (*stadiometer/microtoise*), pita Lingkar Kepala, pita LiLA.
   - **Aktivitas**:
     - Menimbang Berat Badan (BB) dalam satuan kg (presisi 0,05 kg).
     - Mengukur Panjang Badan (PB) posisi telentang untuk usia <24 bulan, atau Tinggi Badan (TB) posisi berdiri untuk usia ≥24 bulan.
     - Mengukur Lingkar Kepala (LK) dan Lingkar Lengan Atas (LiLA) dalam satuan cm.
   - **Output**: Lembar catatan pengukuran fisik balita lengkap.
   - **BPMN**: `Task`

4. **Pencatatan & Pemeriksaan Klinis (Langkah 3 ILP - Pencatatan & Pemeriksaan)**
   - **Aktor**: Kader Pencatatan
   - **Input**: Lembar hasil ukur fisik, wawancara pemberian ASI, skrining batuk/kontak TB.
   - **Aktivitas**: Menginput nilai BB, TB, LK, LiLA, memilih posisi ukur (Telentang/Berdiri), mengisi status ASI Eksklusif (Ya/Tidak untuk usia 0–5 bulan), dan skrining TB (Beresiko / Tidak Beresiko) ke tab *Input Hari Ini*.
   - **Output**: Formulir pengukuran digital terisi lengkap.
   - **BPMN**: `Task`

5. **Kalkulasi & Evaluasi Otomatis Status Pertumbuhan (Growth Engine)**
   - **Aktor**: Sistem Aplikasi Portal Nyawiji
   - **Input**: Data BB, TB, tanggal lahir, jenis kelamin, posisi ukur, data penimbangan bulan sebelumnya.
   - **Aktivitas**:
     - Menghitung umur presisi dalam hari dan bulan penuh.
     - Melakukan koreksi tinggi badan otomatis (±0,7 cm jika posisi ukur tidak sesuai standar usia).
     - Menghitung Z-Score 4 indeks antropometri berdasarkan LMS Standar Permenkes 2/2020.
     - Menghitung delta berat badan vs penimbangan valid sebelumnya untuk menentukan status **N** (Naik) atau **T** (Tidak Naik).
     - Menilai kondisi **2T** (*weight faltering* dua bulan berurutan).
   - **Output**: Status gizi digital otomatis, kurva KMS terbarui, dan badge kewaspadaan (*2T*, *Stunting*, *Wasting*, *Beresiko TB*).
   - **BPMN**: `Task`

6. **DECISION POINT: Evaluasi Status Tumbuh Kembang & Risiko Klinis**
   - **Aktor**: Tenaga Kesehatan (Bidan Desa / Perawat Puskesmas)
   - **Kondisi**:
     - **Cabang A (Normal / Sesuai Standar)**: Balita dengan status gizi normal, berat badan naik (**N**), tidak terindikasi 2T, dan skrining TB tidak beresiko.
     - **Cabang B (Bermasalah Gizi / 2T / Berisiko Sakit)**: Balita mengalami 2T, *wasting*, *severely stunted*, *underweight*, atau skrining TB beresiko.
   - **BPMN**: `Gateway`

7. **Cabang B: Tata Laksana Rujukan & Konseling Medis Terpadu (Langkah 4 ILP)**
   - **Aktor**: Tenaga Kesehatan (Bidan Desa) & Kader
   - **Aktivitas**: Memberikan konseling intensif gizi balita, investigasi pola asuh/asupan, dan menerbitkan Surat Rujukan Medis ke Puskesmas untuk intervensi dokter spesialis anak/nutrisionis serta PMT Pemulihan.
   - **Output**: Surat rujukan Puskesmas dan catatan intervensi medis terdata di sistem.
   - **BPMN**: `Sub Process`

8. **Cabang A: Pelayanan Preventif & Penyuluhan Gizi (Langkah 4 ILP)**
   - **Aktor**: Tenaga Kesehatan & Kader Posyandu
   - **Aktivitas**: Memberikan imunisasi dasar/lanjutan sesuai jadwal, suplementasi Vitamin A (Februari/Agustus), obat cacing, PMT penyuluhan kaya protein hewani, serta edukasi MP-ASI seimbang.
   - **Output**: Balita menerima paket imunisasi/suplemen pencegahan dan orang tua teredukasi.
   - **BPMN**: `Task`

9. **Penyimpanan Data Terpusat & Sinkronisasi Real-Time**
   - **Aktor**: Sistem Portal Nyawiji
   - **Aktivitas**: Menyimpan seluruh data pengukuran secara *autosave* ke basis data lokal dan menyinkronkan ke server database pusat.
   - **Output**: Rekam medis pertumbuhan balita tersimpan secara permanen dan aman.
   - **BPMN**: `Data Store`

10. **Penutupan Sesi & Penyerahan Jadwal Sesi Berikutnya (Langkah 5 ILP)**
    - **Aktor**: Kader Posyandu
    - **Aktivitas**: Mencatat resume pada Buku KIA fisik keluarga, membagikan kartu QR pasien bagi pendaftar baru, serta menyampaikan tanggal hari buka Posyandu bulan berikutnya.
    - **Output**: Sesi pelayanan balita selesai dengan status data *Selesai*.
    - **BPMN**: `End Event`

### Aktor yang Terlibat
- **Bayi & Balita beserta Orang Tua/Wali**: Subjek pelayanan kesehatan primer.
- **Kader Pendaftaran**: Bertanggung jawab atas pencarian, scan QR, dan verifikasi identitas pasien.
- **Kader Penimbangan & Pengukuran**: Bertanggung jawab atas akurasi pengukuran antropometri.
- **Kader Pencatatan**: Bertanggung jawab atas entri data ke dalam Portal Nyawiji.
- **Tenaga Kesehatan (Bidan Desa / Perawat Puskesmas)**: Bertanggung jawab atas verifikasi klinis, tindakan medis, imunisasi, dan rujukan.
- **Sistem Portal Nyawiji**: Mengotomatisasi komputasi Z-score, kurva KMS, status N/T, 2T, dan sinkronisasi data.

### Data & Dokumen yang Digunakan
- **Input Data**: Nama balita, tanggal lahir, jenis kelamin, nama wali, berat badan (kg), panjang/tinggi badan (cm), posisi ukur (telentang/berdiri), lingkar kepala (cm), status ASI eksklusif, skrining TB.
- **Output Data**: Nilai Z-Score (BB/U, TB/U, BB/TB, IMT/U), status kategori gizi, delta BB (kg), status N/T, status 2T, surat rujukan Puskesmas, kurva pertumbuhan KMS digital.
- **Media Penyimpanan**: Basis data SQLite/PostgreSQL server terpusat, penyimpanan lokal *browser* (IndexedDB) untuk ketahanan luring, Buku KIA fisik.

### Exception Handling (Penanganan Kasus Khusus)
- **Kondisi 2T (Weight Faltering)**: Peringatan otomatis muncul dengan warna mencolok; sistem mewajibkan pengisian catatan tindak lanjut dan menolak penutupan status tanpa verifikasi rujukan oleh Nakes.
- **Anak Usia 61–83 Bulan**: Standar Permenkes 2/2020 dibatasi hingga usia 60 bulan penuh; data BB dan TB tetap tersimpan wajib, sedangkan Z-Score dan N/T otomatis dikosongkan (*null*) guna menghindari distorsi statistik.
- **Ketiadaan Jaringan Internet (Offline)**: Data tersimpan aman di antrean lokal perangkat (IndexedDB); kader tetap dapat melayani penimbangan tanpa kendala dan auto-sync berjalan saat sinyal kembali pulih.

### Integrasi & Pelaporan
- **Unit Pelaporan**: Puskesmas Pembina dan Dinas Kesehatan Kabupaten Gunungkidul.
- **Frekuensi**: Bulanan (Rekapitulasi Pelayanan Posyandu).
- **Format Laporan**: Berkas Excel Resmi terstruktur (*Ringkasan*, *Daftar Anggota*, *Detail Pengukuran*, *Daftar Berisiko*) serta dashboard analitik spasial.
- **Indikator Kinerja Utama (KPI)**:
  - Cakupan Balita Ditimbang (D/S).
  - Persentase Balita Naik Berat Badannya (N/D).
  - Prevalensi Stunting (TB/U), Wasting (BB/TB), dan Underweight (BB/U).
  - Persentase Balita 2T yang berhasil dirujuk dan tertangani Puskesmas.
  - Persentase Bayi 0–5 Bulan dengan ASI Eksklusif.

---

## 2. Pelayanan Kesehatan Ibu Hamil (Bumil)

### Ringkasan
- **Tujuan**: Memantau kesehatan ibu dan perkembangan janin, mendeteksi dini faktor risiko kehamilan (Kekurangan Energi Kronis/KEK, anemia, hipertensi gestasional/preeklamsia, dan tuberkulosis), serta memfasilitasi rujukan tepat waktu ke Puskesmas.
- **Pemicu/Trigger**: Kedatangan ibu hamil pada hari buka Posyandu.
- **Sasaran Peserta**: Seluruh ibu hamil di wilayah padukuhan/kalurahan pada trimester 1, 2, dan 3.
- **Frekuensi**: 1 kali per bulan selama masa kehamilan.
- **Output Utama**:
  - Catatan fisik maternal: Berat Badan, Tinggi Badan, Lingkar Lengan Atas (LiLA), Usia Kehamilan (minggu), Tekanan Darah (Sistolik/Diastolik), dan Kadar Hemoglobin (HB).
  - Penilaian status risiko: Status KEK (LiLA < 23,5 cm), Hipertensi (Tensi ≥ 140/90 mmHg), Anemia (HB < 11 g/dL).
  - Suplementasi Tablet Tambah Darah (TTD) dan edukasi Program Perencanaan Persalinan dan Pencegahan Komplikasi (P4K).
  - Surat rujukan terencana ke Puskesmas/Rumah Sakit.

### Alur Proses (Flow)

1. **Kedatangan Ibu Hamil (`Start Event`)**: Ibu hamil tiba di posyandu dengan membawa Buku KIA.
2. **Pendaftaran & Identifikasi Profil (`Task`)**: Kader memverifikasi identitas ibu hamil pada Portal Nyawiji dan memastikan tanda penanda (*flag*) `Pasien Ibu Hamil (Bumil)` aktif.
3. **Pengukuran Fisik & Tanda Vital (`Task`)**: Kader dan Bidan mengukur BB, TB, LiLA, usia kehamilan dalam minggu, tekanan darah, dan pemeriksaan kadar HB menggunakan strip uji POCT.
4. **Pencatatan & Skrining Maternal (`Task`)**: Kader menginput hasil ukur ke sistem, mencatat keluhan kehamilan, dan melakukan skrining gejala batuk/TB.
5. **Analisis Ambang Batas Risiko Otomatis (`Task`)**: Sistem memproses nilai LiLA, tensi, dan HB terhadap ambang batas standar klinis.
6. **DECISION POINT: Penentuan Status Risiko Maternal (`Gateway`)**:
   - **Cabang Risiko Rendah / Normal**: LiLA ≥ 23,5 cm, Tensi < 140/90 mmHg, HB ≥ 11 g/dL, tanpa keluhan risiko.
   - **Cabang Risiko Tinggi (KEK / Hipertensi / Anemia / TB Berisiko)**: LiLA < 23,5 cm atau Tensi ≥ 140/90 mmHg atau HB < 11 g/dL atau TB berisiko.
7. **Cabang Risiko Tinggi: Koordinasi Rujukan ANC Terpadu (`Sub Process`)**: Bidan Desa menerbitkan surat rujukan medis ke Puskesmas untuk pemeriksaan dokter, USG obstetrik, pemberian PMT Bumil KEK, dan perencanaan rujukan bersalin.
8. **Cabang Normal: Pemberian TTD & Edukasi Kehamilan Sehat (`Task`)**: Bidan memberikan Tablet Tambah Darah (minimal 90 tablet selama kehamilan), konseling gizi seimbang, edukasi tanda bahaya kehamilan, dan senam hamil.
9. **Penyimpanan Data Terpusat (`Data Store`)**: Rekam medis antenatal tersimpan otomatis di database posyandu.
10. **Penutupan & Penjadwalan Follow-Up (`End Event`)**: Pencatatan resume di Buku KIA dan penjadwalan kunjungan ulang bulan berikutnya.

### Aktor yang Terlibat
- **Ibu Hamil**: Peserta penerima layanan antenatal care berbasis komunitas.
- **Kader Posyandu**: Melakukan pendaftaran, penimbangan BB/TB, pengukuran LiLA, dan pencatatan digital.
- **Bidan Desa**: Melakukan pemeriksaan tekanan darah, pemeriksaan kehamilan fisik/palpasi, konseling risiko, dan rujukan.
- **Puskesmas**: Fasilitas rujukan penerima kasus ibu hamil risiko tinggi.

### Data & Dokumen yang Digunakan
- **Input**: Identitas bumil, tanggal HPHT/usia kehamilan, BB, TB, LiLA, Tensi Sistolik/Diastolik, HB, keluhan, skrining TB.
- **Output**: Status risiko KEK, status risiko hipertensi kehamilan, status anemia, rekomendasi suplemen, surat rujukan ANC terpadu.
- **Penyimpanan**: Basis data Portal Nyawiji dan Buku KIA fisik.

### Exception Handling
- **Tekanan Darah Mendadak Tinggi (Sistolik ≥ 160 atau Diastolik ≥ 110 mmHg)**: Prosedur darurat preeklamsia berat, Bidan Desa langsung mengoordinasikan rujukan darurat ke IGD Puskesmas/RS didampingi keluarga.
- **Bumil Mengalami KEK (LiLA < 23,5 cm)**: Wajib didaftarkan dalam program Pemberian Makanan Tambahan (PMT) Pemulihan Berbahan Pangan Lokal selama 90 hari kalender.

### Integrasi & Pelaporan
- **Pelaporan**: Terintegrasi dalam Laporan Kesehatan Ibu dan Anak (KIA) Puskesmas dan Dinas Kesehatan.
- **KPI**: % Kunjungan Antenatal K1 dan K6; % Ibu Hamil KEK yang Mendapatkan PMT Pemulihan; % Ibu Hamil Anemia yang Tertangani.

---

## 3. Pelayanan Kesehatan Usia Sekolah dan Remaja (7–17 Tahun)

### Ringkasan
- **Tujuan**: Skrining status gizi, deteksi dini anemia pada remaja putri, pencegahan hipertensi usia muda, deteksi kelainan refraksi penglihatan dan pendengaran, serta edukasi kesehatan reproduksi remaja.
- **Pemicu/Trigger**: Penyelenggaraan Posyandu Remaja bulanan / Posyandu Siklus Hidup.
- **Sasaran Peserta**: Remaja usia 7 hingga 17 tahun di wilayah padukuhan.
- **Frekuensi**: Bulanan atau triwulanan sesuai kalender posyandu remaja.
- **Output Utama**: Nilai IMT, Lingkar Perut, Tekanan Darah, Status Skrining Penglihatan/Pendengaran, Kadar HB, Penyerahan TTD Remaja Putri, serta Rujukan Puskesmas jika ditemukan gangguan kesehatan.

### Alur Proses (Flow)

1. **Kehadiran Remaja (`Start Event`)**: Remaja berkumpul di lokasi Posyandu Remaja.
2. **Pendaftaran Digital (`Task`)**: Kader mencari profil remaja atau mendaftarkan remaja baru di Portal Nyawiji (otomatis tergolong kategori `REMAJA`).
3. **Pengukuran Antropometri & Skrining Indra (`Task`)**: Pengukuran BB, TB, lingkar perut, pemeriksaan tekanan darah, tes tajam penglihatan sederhana (*Snellen Chart*), tes bisik pendengaran, serta pemeriksaan kadar HB (terutama bagi remaja putri).
4. **Pencatatan Hasil ke Portal Nyawiji (`Task`)**: Kader menginput seluruh parameter pengukuran dan hasil skrining organ indra ke sistem.
5. **Evaluasi Otomatis Indikator Kesehatan Remaja (`Task`)**: Sistem menghitung IMT, mendeteksi hipertensi (≥140/90), anemia (HB < 12 g/dL), dan menandai skrining indra tidak normal.
6. **DECISION POINT: Status Kesehatan Remaja (`Gateway`)**:
   - **Kondisi Normal**: Semua parameter dalam batas sehat.
   - **Kondisi Bermasalah**: Terindikasi anemia, gizi kurang/obesitas, hipertensi, gangguan indra, atau skrining TB berisiko.
7. **Kondisi Bermasalah: Konseling Khusus & Rujukan Fasilitas Primer (`Sub Process`)**: Petugas Puskesmas/Kader memberikan konseling nutrisi intensif dan merujuk remaja ke Puskesmas untuk penanganan medis lanjutan.
8. **Kondisi Normal: Distribusi Suplementasi & KIE Remaja Sehat (`Task`)**: Penyerahan Tablet Tambah Darah (TTD) berkala untuk remaja putri, edukasi pencegahan anemia, bahaya merokok/narkoba, dan kesehatan reproduksi.
9. **Penyimpanan Rekam Medis Remaja (`Data Store`)**: Data sesi remaja tersimpan aman di database.
10. **Penutupan Pertemuan (`End Event`)**: Pemberian ringkasan hasil kesehatan dan penetapan agenda posyandu remaja bulan berikutnya.

### Aktor yang Terlibat
- **Remaja (Putra & Putri)**: Peserta layanan.
- **Kader Posyandu Remaja**: Mengelola pendaftaran, pengukuran fisik, dan pencatatan.
- **Petugas Puskesmas (Promkes / Perawat / Bidan)**: Fasilitator konseling kesehatan remaja dan pengampu rujukan.

### Data & Dokumen yang Digunakan
- **Input**: Identitas remaja, BB, TB, tensi, lingkar perut, status skrining indra, kadar HB, skrining TB.
- **Output**: Kategori IMT, status anemia, status tensi, catatan konseling, formulir rujukan Puskesmas.
- **Penyimpanan**: Basis data Portal Nyawiji.

### Exception Handling
- **Remaja Putri dengan Anemia Berat (HB < 8 g/dL)**: Bidan segera berkoordinasi dengan orang tua dan merujuk ke dokter Puskesmas untuk evaluasi penyebab anemia dan terapi lanjutan.

### Integrasi & Pelaporan
- **Pelaporan**: Rekapitulasi Pembinaan Kesehatan Usia Sekolah dan Remaja ke Puskesmas dan Dinas Kesehatan.
- **KPI**: Persentase Remaja Putri Mengonsumsi TTD; Prevalensi Anemia Remaja; Cakupan Skrining Kesehatan Remaja.

---

## 4. Pelayanan Kesehatan Usia Produktif dan Lansia (Dewasa 18–59 Th & Lansia 60+ Th)

### Ringkasan
- **Tujuan**: Skrining berkala faktor risiko Penyakit Tidak Menular (PTM) seperti Hipertensi, Diabetes Melitus, Dislipidemia, Hiperurisemia, Obesitas Sentral, skrining penglihatan/katarak, skrining pendengaran, dan skrining tuberkulosis pada populasi dewasa dan lanjut usia.
- **Pemicu/Trigger**: Kehadiran warga usia produktif dan lansia pada hari buka Posyandu Siklus Hidup / Posbindu PTM.
- **Sasaran Peserta**: Warga usia 18–59 tahun (`DEWASA`) dan usia ≥60 tahun (`LANSIA`).
- **Frekuensi**: 1 kali per bulan.
- **Output Utama**:
  - Rekam IMT dan Lingkar Perut (deteksi obesitas sentral: pria >90 cm, wanita >80 cm).
  - Profil Tekanan Darah (Sistolik & Diastolik) untuk deteksi dini hipertensi.
  - Hasil Uji Laboratorium Sederhana (*Point of Care Testing* / POCT): Gula Darah Sewaktu (GDS), Kolesterol Total, dan Asam Urat.
  - Evaluasi Skrining TB dan Skrining Indra Mata/Telinga.
  - Edukasi Pola Hidup Bersih & Sehat (CERDIK/GERMAS) serta rujukan farmakologis ke Puskesmas bagi penderita PTM berisiko.

### Alur Proses (Flow)

1. **Kehadiran Warga Dewasa/Lansia (`Start Event`)**: Warga hadir di posyandu pada meja pendaftaran.
2. **Identifikasi Data & Verifikasi Kategori (`Task`)**: Kader memindai kartu QR warga atau mencari nama pada sistem; Portal Nyawiji secara otomatis menetapkan kategori `DEWASA` atau `LANSIA` berdasarkan tanggal lahir.
3. **Pemeriksaan Antropometri, Tensi & Laboratorium Sederhana (`Task`)**: Kader dan Nakes mengukur BB, TB, lingkar perut, tensi darah, skrining indra, serta melakukan uji darah kapiler sederhana (GDS, kolesterol, asam urat) jika strip tes tersedia.
4. **Pencatatan Lengkap ke Sistem Portal Nyawiji (`Task`)**: Kader menginput seluruh hasil pengukuran dan pemeriksaan lab ke dalam tab *Input Hari Ini*.
5. **Evaluasi Otomatis Batas Abnormalitas Klinis (`Task`)**: Sistem membandingkan nilai hasil input dengan ambang batas baku:
   - Hipertensi: Tensi ≥ 140/90 mmHg.
   - Hiperglikemia: GDS ≥ 126 mg/dL.
   - Hiperkolesterolemia: Kolesterol Total ≥ 200 mg/dL.
   - Hiperurisemia: Asam Urat Pria > 7,0 mg/dL; Wanita > 6,0 mg/dL.
   - Skrining Indra / TB: Nilai *Tidak Normal* / *Beresiko*.
6. **DECISION POINT: Klasifikasi Kondisi Kesehatan Warga (`Gateway`)**:
   - **Kondisi Terkontrol / Normal**: Seluruh indikator berada dalam batas wajar.
   - **Kondisi Abnormal / Risiko Tinggi PTM / TB Berisiko**: Satu atau lebih indikator melampaui batas aman.
7. **Kondisi Risiko Tinggi: Intervensi Medis Awal & Rujukan Puskesmas (`Sub Process`)**: Nakes Puskesmas memberikan konsultasi klinis awal, mencatat riwayat konsumsi obat rutin, dan menerbitkan rujukan ke Poli Umum Puskesmas untuk pemeriksaan dokter dan penyesuaian terapi obat PTM.
8. **Kondisi Normal: Edukasi Perilaku Hidup Sehat & Senam Bugar (`Task`)**: Kader memberikan penyuluhan perilaku hidup sehat CERDIK (Cek kesehatan berkala, Enyahkan asap rokok, Rajin aktivitas fisik, Diet seimbang, Istirahat cukup, Kelola stres), anjuran senam lansia, dan pembatasan konsumsi Gula Garam Lemak (GGL).
9. **Penyimpanan Profil Faktor Risiko PTM (`Data Store`)**: Rekam jejak faktor risiko tersimpan terintegrasi pada basis data posyandu.
10. **Penutupan Sesi Layanan (`End Event`)**: Pemberian kartu catatan hasil pemeriksaan kepada warga dan penjadwalan pemeriksaan rutin bulan depan.

### Aktor yang Terlibat
- **Warga Usia Produktif & Lansia**: Peserta skrining PTM berkala.
- **Kader Posyandu**: Bertugas melakukan registrasi, pengukuran antropometri, dan entri data.
- **Tenaga Kesehatan Puskesmas**: Bertugas melakukan pemeriksaan POCT lab sederhana, evaluasi tensi, konseling medis, dan rujukan.

### Data & Dokumen yang Digunakan
- **Input**: Data identitas, BB, TB, Lingkar Perut, Tekanan Darah, nilai GDS, nilai Kolesterol, nilai Asam Urat, hasil skrining mata/telinga, skrining TB.
- **Output**: Klasifikasi IMT, status tensi, status lab sederhana, status skrining indra/TB, lembar rujukan PTM Puskesmas.
- **Penyimpanan**: Basis data Portal Nyawiji.

### Exception Handling
- **Krisis Hipertensi (Sistolik ≥ 180 atau Diastolik ≥ 120 mmHg) atau GDS ≥ 300 mg/dL**: Nakes segera memberikan penanganan stabilisasi awal di tempat dan merujuk pasien sesegera mungkin ke UGD Puskesmas.

### Integrasi & Pelaporan
- **Pelaporan**: Laporan Skrining PTM dan Kesehatan Lansia teragregasi bulanan ke Puskesmas dan Dinas Kesehatan Kabupaten Gunungkidul.
- **KPI**: Persentase Warga Usia ≥15 Tahun yang Diskrining PTM; Cakupan Skrining Hipertensi dan Diabetes Melitus; Persentase Kasus PTM Terkontrol.

---

## 5. Validasi, Sinkronisasi Offline-First, dan Rekapitulasi Pelayanan Posyandu

### Ringkasan
- **Tujuan**: Memastikan keabsahan dan kelengkapan seluruh data hasil pelayanan hari buka posyandu, memproses rekonsiliasi data antrean lokal ke server pusat tanpa duplikasi atau kehilangan data, serta menerbitkan laporan resmi rekapitulasi posyandu berformat Excel.
- **Pemicu/Trigger**: Berakhirnya seluruh rangkaian penimbangan dan pemeriksaan pada hari buka Posyandu.
- **Sasaran**: Seluruh berkas pengukuran pasien yang tercatat pada sesi hari berjalan.
- **Frekuensi**: Bulanan pada akhir setiap hari pelayanan posyandu.
- **Output Utama**:
  - Seluruh data berstatus *Selesai diukur* (BB & TB terisi lengkap).
  - Basis data server terisi 100% konsisten dengan antrean lokal (*Queue 0 item pending*).
  - Berkas Rekapitulasi Resmi Posyandu (Excel) dengan lembar kerja: *Ringkasan*, *Daftar Anggota*, *Detail Pengukuran*, dan *Daftar Berisiko*.

### Alur Proses (Flow)

1. **Penutupan Sesi Pelayanan Hari Buka (`Start Event`)**: Kader posyandu menyelesaikan penimbangan pasien terakhir dan menutup sesi antrean.
2. **Audit Kelengkapan Data Pasien (`Task`)**: Kader menyaring filter status di beranda (*Belum* / *Diukur Sebagian* / *Selesai*) untuk memastikan tidak ada pasien yang tertinggal pengukurannya.
3. **Inspeksi Antrean & Status Jaringan (`Task`)**: Engine aplikasi memeriksa antrean lokal IndexedDB dan memverifikasi koneksi internet perangkat.
4. **DECISION POINT: Ketersediaan Sinyal Jaringan Internet (`Gateway`)**:
   - **Kondisi Offline (Blank Spot / Tanpa Sinyal)**: Perangkat tidak terhubung ke internet.
   - **Kondisi Online (Terhubung Internet)**: Perangkat memiliki koneksi internet aktif.
5. **Kondisi Offline: Prosedur Perlindungan Data Luring (`Task`)**: Aplikasi menyimpan seluruh data dalam penyimpanan terenkripsi lokal perangkat; kader diinstruksikan untuk **tidak melakukan logout** dan membawa perangkat ke area dengan jangkauan sinyal internet stabil.
6. **Kondisi Online: Sinkronisasi Payload Otomatis (`Task`)**: Engine *Offline-Sync* mengirimkan seluruh antrean lokal ke API server dengan validasi *idempotency client-id* untuk mencegah duplikasi data.
7. **Penyimpanan Permanen Database Server (`Data Store`)**: Server database menerima dan memperbarui seluruh catatan pengukuran sesi secara terpusat.
8. **Konfigurasi Ekspor Laporan Bulanan (`Task`)**: Kader membuka panel *Export Data*, memilih periode bulan berjalan, memeriksa pratinjau data (*preview count*), dan memastikan sheet *Daftar Berisiko* memuat kasus 2T dan rujukan yang sesuai.
9. **Unduh Berkas Rekap Excel & Penyerahan ke Puskesmas (`Sub Process`)**: Kader mengunduh berkas resmi Excel Posyandu dan menyerahkannya kepada Staf Pembina Puskesmas sebagai pertanggungjawaban resmi.
10. **Pengarsipan & Penutupan Aplikasi (`End Event`)**: Kader mendokumentasikan arsip posyandu dan keluar dari aplikasi secara aman.

### Aktor yang Terlibat
- **Kader Posyandu**: Pelaksana audit data lapangan dan pelaporan.
- **Sistem Portal Nyawiji (Offline-Sync Engine)**: Mengelola penyimpanan IndexedDB, antrean sinkronisasi, dan validasi data.
- **Staf Pembina Puskesmas**: Penerima laporan rekapitulasi posyandu.

### Data & Dokumen yang Digunakan
- **Input**: Seluruh rekaman pengukuran sesi hari ini di antrean lokal.
- **Output**: Laporan Excel Posyandu 4 lembar kerja (*Ringkasan*, *Daftar Anggota*, *Detail Pengukuran*, *Daftar Berisiko*).
- **Penyimpanan**: IndexedDB lokal HP/laptop kader dan Database SQLite/PostgreSQL server.

### Exception Handling
- **Terjadi Bentrok Versi Data (Data Conflict / Race Condition)**: Jika dua kader mengedit pasien yang sama, sistem menampilkan modal `Data Bentrok — Muat Ulang` dengan prinsip *last-write-wins* transparan agar kader dapat memeriksa pembaruan terkini.

---

## 6. Pembinaan Wilayah, Pengawasan Pelayanan, dan Pengelolaan Akun oleh Puskesmas

### Ringkasan
- **Tujuan**: Melaksanakan supervisi mutu pelayanan kesehatan seluruh posyandu binaan di tingkat Kapanewon, melakukan audit pencatatan melalui mode inspeksi data aman, mengelola hak akses akun posyandu binaan, dan menghasilkan rekapitulasi data wilayah untuk Lokakarya Mini (Lokmin) Puskesmas.
- **Pemicu/Trigger**: Jadwal evaluasi bulanan Puskesmas, penerimaan berkas laporan kader, atau permohonan bantuan teknis/reset password dari posyandu binaan.
- **Sasaran**: Seluruh unit Posyandu di bawah wilayah kerja administratif Puskesmas bersangkutan.
- **Frekuensi**: Harian/Bulanan/Sesuai kebutuhan pengawasan.
- **Output Utama**:
  - Akun posyandu binaan terkelola (registrasi unit baru, reset password, aktivasi/penonaktifan).
  - Audit pencatatan posyandu via fitur *Buka Meja* (mode *Read-Only*).
  - Laporan Konsolidasi Wilayah Puskesmas (Excel multi-posyandu hingga 30 unit / 20.000 baris data).
  - Rencana tindak lanjut pembinaan dan intervensi gizi/kesehatan tingkat Kapanewon.

### Alur Proses (Flow)

1. **Akses Portal oleh Staf Puskesmas (`Start Event`)**: Petugas/Admin Puskesmas membuka Portal Nyawiji.
2. **Otentikasi Kredensial Puskesmas (`Task`)**: Login menggunakan username instansi (misal `@pkm_wonosari1`) dan password terenkripsi.
3. **Pemantauan Dashboard Analitik Wilayah Binaan (`Task`)**: Sistem menyajikan agregat partisipasi, peringkat posyandu berdasarkan keaktifan penimbangan, sebaran status gizi balita, tren N/T dan 2T, serta daftar pasien berisiko di wilayah binaan.
4. **Analisis Kebutuhan Intervensi Wilayah (`Task`)**: Bidan Koordinator dan Staf Puskesmas menganalisis data untuk menentukan posyandu dengan cakupan rendah atau lonjakan temuan kasus balita 2T dan penyakit tidak menular.
5. **DECISION POINT: Penentuan Modul Tindakan Operasional (`Gateway`)**:
   - **Jalur A (Supervisi & Audit Data Layanan)**: Memeriksa langsung rincian pencatatan posyandu tertentu.
   - **Jalur B (Tata Kelola Akun Posyandu Binaan)**: Mengelola pendaftaran posyandu baru atau reset password kader.
   - **Jalur C (Ekspor Rekapitulasi Wilayah Konsolidasi)**: Menghasilkan data untuk Lokakarya Mini.
6. **Jalur A: Eksekusi Fitur "Buka Meja" (`Task`)**: Staf Puskesmas membuka meja data posyandu terpilih dalam mode *Read-Only* untuk memverifikasi entri kader tanpa risiko mengubah atau menghapus data asli.
7. **Jalur B: Tata Kelola Akun & Reset Password (`Task`)**: Menambahkan posyandu baru, mereset password posyandu yang lupa ke nilai default (mewajibkan kader aktivasi ulang), atau menonaktifkan akun posyandu non-aktif tanpa menghapus riwayat kesehatan warga.
8. **Jalur C: Ekspor Data Wilayah Konsolidasi (`Sub Process`)**: Membuka panel *Rekap Wilayah*, memilih posyandu binaan yang akan dikonsolidasi, mengekspor laporan Excel multi-posyandu (maksimal 30 unit/20.000 baris).
9. **Penyimpanan Perubahan Status Akun (`Data Store`)**: Seluruh pembaruan hak akses tersimpan di basis data server pusat.
10. **Penutupan & Rekomendasi Lokmin (`End Event`)**: Mempublikasikan hasil evaluasi wilayah pada Lokakarya Mini Tribulanan Puskesmas dan mendistribusikan umpan balik pembinaan ke kader posyandu.

### Aktor yang Terlibat
- **Kepala Puskesmas & Bidan Koordinator**: Pengambil keputusan program kesehatan wilayah.
- **Admin / Staf Pengelola Sistem Puskesmas**: Operator teknis manajemen akun dan analitik data.
- **Kader Posyandu Binaan**: Penerima pembinaan dan pemegang akun layanan.

### Data & Dokumen yang Digunakan
- **Input**: Data seluruh posyandu binaan, riwayat pengukuran pasien se-wilayah kerja Puskesmas.
- **Output**: Laporan Rekap Wilayah Puskesmas (Excel), log audit supervisi, status kredensial posyandu.
- **Penyimpanan**: Basis data terpusat Portal Nyawiji.

### Exception Handling
- **Permintaan Hapus Posyandu yang Sudah Berisi Data Pasien**: Sistem menolak penghapusan permanen (*Fail-Safe Restrict*) untuk melindungi arsip rekam medis; sistem hanya mengizinkan aksi *Nonaktifkan Akun*.

---

## 7. Tata Kelola Master Data Wilayah, Agregasi Kebijakan, dan Evaluasi Kesehatan oleh Dinas Kesehatan

### Ringkasan
- **Tujuan**: Menjamin standarisasi master data kewilayahan kesehatan se-Kabupaten Gunungkidul, mengelola akun Puskesmas, melakukan pemeliharaan engine Z-score (*Backfill calculation*), menyusun analisis kebijakan kesehatan makro berbasis agregat murni tanpa melanggar privasi data pribadi warga, serta menyediakan laporan resmi untuk Bupati dan Kementerian Kesehatan RI.
- **Pemicu/Trigger**: Perencanaan strategis daerah, pembaruan standar pedoman gizi Kementerian Kesehatan, evaluasi tahunan percepatan penurunan stunting kabupaten, atau penambahan unit fasilitas kesehatan baru.
- **Sasaran**: Seluruh Kapanewon, Puskesmas, Kalurahan, dan Posyandu se-Kabupaten Gunungkidul.
- **Frekuensi**: Bulanan, semesteran, tahunan, atau saat pembaruan regulasi.
- **Output Utama**:
  - Master data wilayah terstandarisasi (18 Kapanewon, 30 Puskesmas, seluruh Kalurahan & Posyandu).
  - Akun staf Puskesmas aktif dan terkelola.
  - Hasil pemeliharaan kalkulasi ulang data historis antropometri (*Backfill Growth Engine* Z-score).
  - Laporan Rekapitulasi Agregat Kabupaten (Excel tanpa nama individu pasien) untuk perumusan kebijakan daerah.

### Alur Proses (Flow)

1. **Akses Portal Tingkat Kabupaten (`Start Event`)**: Administrator Dinas Kesehatan mengakses Portal Nyawiji.
2. **Otentikasi Super Admin Dinkes (`Task`)**: Login menggunakan username khusus super admin (contoh `dinkes_gk`) dengan otentikasi tingkat tinggi.
3. **Pemantauan Dashboard Agregat Kabupaten (`Task`)**: Sistem menyajikan visualisasi makro: total puskesmas, posyandu aktif, cakupan penimbangan se-kabupaten, sebaran prevalensi stunting per Kapanewon, serta tren penyakit tidak menular.
4. **Analisis Kebijakan Kesehatan Daerah (`Task`)**: Tim Perencana Dinkes mengevaluasi tren indikator kesehatan masyarakat secara agregat murni tanpa menampilkan nama individu pasien (menjaga privasi data medis warga).
5. **DECISION POINT: Kebutuhan Manajemen Sistem & Master Data (`Gateway`)**:
   - **Jalur A (Impor / Pemutakhiran Master Data Wilayah)**: Menambah atau menyinkronkan data wilayah dan posyandu.
   - **Jalur B (Pemeliharaan Algoritma / Backfill Z-Score)**: Menghitung ulang data historis sesuai pembaruan standar antropometri.
   - **Jalur C (Ekspor Rekapitulasi Eksekutif Kabupaten)**: Menerbitkan laporan agregat untuk pimpinan daerah dan Kemenkes.
6. **Jalur A: Impor Massal Wilayah & Akun Puskesmas (`Task`)**: Mengunggah berkas CSV/Excel master wilayah; sistem secara otomatis mendeteksi Puskesmas, mengaitkannya ke Kapanewon, dan membuat akun staf Puskesmas baru.
7. **Jalur B: Eksekusi Backfill Growth Engine (`Sub Process`)**: Menjalankan engine komputasi ulang Z-score (`POST /api/dinkes/backfill-growth`) untuk memastikan seluruh data historis balita terhitung secara akurat sesuai Permenkes No. 2 Tahun 2020.
8. **Jalur C: Ekspor Rekapitulasi Agregat Kabupaten (`Task`)**: Mengunduh berkas Excel *Rekap Kabupaten* (periode hingga 24 bulan) yang memuat agregat ringkasan per unit tanpa mengekspos data pribadi pasien.
9. **Penyimpanan Konfigurasi & Basis Data Wilayah (`Data Store`)**: Master data dan parameter sistem tersimpan di basis data pusat.
10. **Penutupan Sesi & Diseminasi Laporan (`End Event`)**: Menyampaikan laporan kebijakan kepada Kepala Dinas Kesehatan, Bupati Gunungkidul, dan Kementerian Kesehatan RI melalui satu data kesehatan.

### Aktor yang Terlibat
- **Kepala Dinas Kesehatan & Kepala Bidang Kesmas**: Pemangku kebijakan kesehatan daerah.
- **Administrator Sistem Dinkes**: Pengelola infrastruktur master data dan pemeliharaan engine aplikasi.
- **Pemerintah Daerah (Bupati / Bappeda) & Kemenkes RI**: Penerima laporan kebijakan agregat.

### Data & Dokumen yang Digunakan
- **Input**: File impor CSV master wilayah, database transaksi pengukuran se-kabupaten.
- **Output**: Master data wilayah aktif, log eksekusi backfill Z-score, Berkas Excel Rekap Agregat Kabupaten.
- **Penyimpanan**: Basis data PostgreSQL/SQLite server tingkat kabupaten.

### Exception Handling
- **Perubahan Standar Rumus Antropometri Nasional**: Fitur *Backfill Growth Engine* menjamin ribuan data historis balita dapat diperbarui nilai Z-score-nya secara instan tanpa mengganggu jalannya pelayanan posyandu di lapangan.

---

## Ringkasan Findings & Validasi Analisis

### 1. Cakupan Proses & Komponen Terpetakan
- **Total Proses**: 7 Proses Bisnis Lengkap (4 Proses Utama Layanan Siklus Hidup, 2 Proses Manajemen Mutu Data & Pembinaan, 1 Proses Pendukung Tata Kelola Daerah).
- **Total Aktivitas**: 70 Aktivitas Terstandarisasi (setiap proses memiliki 10 aktivitas runtut dari *Start Event* hingga *End Event*).
- **Kesesuaian Standar**: Mengadopsi penuh **5 Langkah Posyandu Integrasi Layanan Primer (ILP)** Kemenkes RI dan **Permenkes No. 2 Tahun 2020** tentang Standar Antropometri Anak.

### 2. Decision Points & Branching Logic Teridentifikasi
- **Proses 1 (Balita)**: Keputusan Status Gizi & Peringatan 2T (*Weight Faltering*) -> Cabang Normal vs Cabang Rujukan Medis Puskesmas.
- **Proses 2 (Bumil)**: Keputusan Status Risiko Kehamilan (KEK, Hipertensi Gestasional, Anemia, TB) -> Cabang Konseling Normal vs Cabang Rujukan ANC Terpadu.
- **Proses 3 (Remaja)**: Keputusan Deteksi Dini Anemia & Gangguan Indra -> Cabang Edukasi/TTD vs Cabang Rujukan Puskesmas.
- **Proses 4 (Dewasa/Lansia)**: Keputusan Ambang Batas PTM & POCT Lab Sederhana -> Cabang GERMAS vs Cabang Rujukan Poli Umum Puskesmas.
- **Proses 5 (Manajemen Posyandu)**: Keputusan Status Konektivitas Jaringan -> Cabang Auto-Sync Online vs Cabang Proteksi Antrean Luring (IndexedDB).
- **Proses 6 (Puskesmas)**: Keputusan Tindakan Operasional -> Cabang Audit Buka Meja (Read-Only) vs Cabang Tata Kelola Akun vs Cabang Rekap Wilayah.
- **Proses 7 (Dinas Kesehatan)**: Keputusan Pemeliharaan Sistem -> Cabang Impor Master Data vs Cabang Backfill Growth Engine vs Cabang Laporan Agregat Daerah.

### 3. Validasi Aliran Data & Privasi (Privacy by Design)
- **Hierarki Privasi Berjenjang**:
  - **Kader Posyandu**: Akses data individu lengkap (nama, NIK, alamat, riwayat) khusus unitnya sendiri.
  - **Puskesmas**: Akses data individu posyandu binaan dalam mode pembinaan/buka meja.
  - **Dinas Kesehatan**: Akses agregat murni per wilayah tanpa nama pasien, menjamin perlindungan data pribadi medis sesuai regulasi PDP.
- **Integritas Alur Kerja**: Semua aktivitas terhubung secara logis tanpa adanya aktivitas yang terputus (*orphan task*), pelaksana terdefinisi presisi, dan simbol BPMN terstandarisasi.
