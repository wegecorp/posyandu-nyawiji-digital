# DFD — Data Flow Diagram Portal Nyawiji

Aliran data sistem untuk **developer Dinas Kesehatan Kabupaten Gunungkidul**.

- **Notasi**: Yourdon/DeMarco, direpresentasikan dengan Mermaid (render otomatis di GitHub).
- **Level**: Context Diagram (Level 0), DFD Level 1 (proses + data store), DFD Level 2
  (dua alur paling kritikal).
- **Sumber**: `src/app/api/**`, `prisma/schema.prisma`, `PROJECT_POSYANDU/03_OUTPUT/BUSINESS_PROCESS_NARRATIVE.md`.

---

## 1. Notasi & Konvensi

| Elemen DFD | Simbol Mermaid | Keterangan |
|---|---|---|
| Entitas eksternal | `[ ]` abu | di luar batas sistem |
| Proses | `( )` hijau muda | nomor proses = level (mis. `1.0`) |
| Data store | `[( )]` | tabel database / penyimpanan klien |
| Aliran data | `-->` berlabel | arah + nama data |
| Batas sistem | `subgraph` | Portal Nyawiji |

> Catatan: notasi DeMarco menggambar data store sebagai dua garis sejajar. Mermaid
> tidak memilikinya, jadi dipakai silinder (konvensi umum lain). Yang penting
> konsisten dan terbaca.

### Entitas eksternal

| Kode | Entitas | Peran |
|---|---|---|
| E1 | Orang tua / Peserta | membawa balita, bumil, remaja, warga dewasa/lansia |
| E2 | Kader Posyandu | pengguna utama; input data lapangan |
| E3 | Tenaga Kesehatan (Bidan/Perawat) | verifikasi klinis, rujukan, imunisasi |
| E4 | Staf Puskesmas | supervisi wilayah, kelola akun, rekap |
| E5 | Admin Dinkes | master data, backfill, agregat kebijakan |
| E6 | Pimpinan Daerah & Kemenkes | penerima laporan agregat |
| E7 | Google Drive (rclone) | tujuan cadangan backup luar ruang |
| E8 | Telegram Bot (opsional) | notifikasi kegagalan backup |

### Data store

| Kode | Nama | Sumber |
|---|---|---|
| D1 | Kapanewon | `prisma/schema.prisma` model `Kapanewon` |
| D2 | Kalurahan | model `Kalurahan` |
| D3 | HealthCenter (Puskesmas) | model `HealthCenter` |
| D4 | Posyandu | model `Posyandu` |
| D5 | User (akun & tokenVersion) | model `User` |
| D6 | Patient | model `Patient` |
| D7 | Measurement | model `Measurement` |
| D8 | Antrean lokal peramban (`localStorage`) | `src/lib/offline-sync.ts` (di perangkat kader) |
| D9 | Arsip backup | `scripts/backup-db.sh` (`/var/backups/posyandu` + Drive) |

---

## 2. Context Diagram (Level 0)

```mermaid
flowchart LR
    classDef ext fill:#f0f2f5,stroke:#8696a0,color:#111b21
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44

    E1["E1 Orang tua /<br/>Peserta"]:::ext
    E2["E2 Kader<br/>Posyandu"]:::ext
    E3["E3 Tenaga Kesehatan<br/>(Bidan/Perawat)"]:::ext
    E4["E4 Staf<br/>Puskesmas"]:::ext
    E5["E5 Admin<br/>Dinkes"]:::ext
    E6["E6 Pimpinan Daerah<br/>& Kemenkes"]:::ext
    E7["E7 Google Drive<br/>(rclone)"]:::ext
    E8["E8 Telegram Bot<br/>(opsional)"]:::ext

    SYS(("PORTAL<br/>NYAWIJI")):::sys

    E1 -- "identitas peserta,<br/>hasil ukur, keluhan" --> SYS
    SYS -- "jadwal Posyandu,<br/>kartu QR, resume Buku KIA" --> E1

    E2 -- "pendaftaran, pengukuran,<br/>skrining, permintaan export" --> SYS
    SYS -- "daftar pasien, status kelengkapan,<br/>berkas Excel, status 2T" --> E2

    E3 -- "verifikasi klinis,<br/>tindakan, rujukan" --> SYS
    SYS -- "daftar berisiko,<br/>kurva pertumbuhan" --> E3

    E4 -- "kredensial, pilihan unit,<br/>aksi kelola akun" --> SYS
    SYS -- "dashboard wilayah binaan,<br/>rekap Excel, log audit" --> E4

    E5 -- "file master wilayah,<br/>trigger backfill" --> SYS
    SYS -- "agregat kabupaten<br/>(tanpa nama pasien)" --> E5
    SYS -- "laporan agregat" --> E6

    SYS -- "berkas dump terenkripsi rclone" --> E7
    SYS -- "pesan status backup" --> E8
```

---

## 3. DFD Level 1

Tujuh proses bisnis utama + satu proses pendukung (autentikasi). Penomoran
mengikuti `BUSINESS_PROCESS_NARRATIVE.md`.

```mermaid
flowchart TB
    classDef ext fill:#f0f2f5,stroke:#8696a0,color:#111b21
    classDef proc fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef store fill:#ffffff,stroke:#075e54,color:#054c44

    E2["E2 Kader"]:::ext
    E3["E3 Nakes"]:::ext
    E4["E4 Staf Puskesmas"]:::ext
    E5["E5 Admin Dinkes"]:::ext
    E6["E6 Pimpinan & Kemenkes"]:::ext

    P1(("1.0 Pelayanan<br/>Bayi & Balita")):::proc
    P2(("2.0 Pelayanan<br/>Ibu Hamil")):::proc
    P3(("3.0 Pelayanan<br/>Remaja")):::proc
    P4(("4.0 Pelayanan<br/>Dewasa & Lansia")):::proc
    P5(("5.0 Validasi, Sinkronisasi<br/>& Rekapitulasi")):::proc
    P6(("6.0 Pembinaan Wilayah &<br/>Pengelolaan Akun")):::proc
    P7(("7.0 Master Data &<br/>Agregasi Kebijakan")):::proc
    P8(("8.0 Autentikasi<br/>& Sesi")):::proc

    D4[("D4 Posyandu")]:::store
    D5[("D5 User")]:::store
    D6[("D6 Patient")]:::store
    D7[("D7 Measurement")]:::store
    D8[("D8 Antrean lokal<br/>localStorage")]:::store
    D9[("D9 Arsip backup")]:::store

    E2 -- "hasil ukur + skrining" --> P1
    E3 -- "tindakan & rujukan" --> P1
    P1 -- "status gizi, N/T, 2T" --> D7
    P1 -- "badge berisiko, kurva" --> E2
    P1 -- "daftar rujukan" --> E3

    E2 -- "hasil ukur maternal" --> P2
    E3 -- "tensi, HB, rujukan ANC" --> P2
    P2 -- "status KEK/anemia" --> D7

    E2 -- "ukur, skrining indra, HB" --> P3
    P3 -- "IMT, status anemia" --> D7

    E2 -- "ukur, tensi, lab POCT" --> P4
    P4 -- "status PTM" --> D7

    P1 -- "patch pengukuran" --> D8
    P2 -- "patch pengukuran" --> D8
    P3 -- "patch pengukuran" --> D8
    P4 -- "patch pengukuran" --> D8
    D8 -- "payload idempoten<br/>(client-id, pasien+bulan)" --> P5
    P5 -- "upsert pengukuran" --> D7
    P5 -- "registrasi pasien" --> D6
    P5 -- "berkas Excel 4 sheet" --> E2
    D6 -- "daftar pasien & kelengkapan" --> P5

    E4 -- "kredensial, pilihan unit" --> P6
    P6 -- "akun posyandu baru /<br/>reset / nonaktif" --> D5
    P6 -- "data binaan" --> D4
    P6 -- "rekap wilayah" --> E4

    E5 -- "file wilayah, trigger backfill" --> P7
    P7 -- "Kapanewon/Kalurahan/Puskesmas/<br/>Posyandu + akun" --> D4
    P7 -- "akun staf & kader" --> D5
    P7 -- "hitung ulang z* & N/T" --> D7
    P7 -- "agregat kabupaten" --> E5
    P7 -- "laporan" --> E6

    P8 -- "verifikasi tokenVersion" --> D5
    P8 -- "sesi JWT" --> E2
    P8 -- "sesi JWT" --> E4
    P8 -- "sesi JWT" --> E5

    D7 -- "dump terverifikasi" --> D9
```

**Aturan DFD yang dipatuhi:**

- Tidak ada *black hole* (proses tanpa output) atau *miracle* (output tanpa input).
- Aliran hanya antar-level yang sah: Entitas ↔ Proses ↔ Data Store. Entitas tidak
  pernah menulis langsung ke data store.
- D8 (antrean `localStorage`) berada **di sisi klien** tetapi tetap digambar sebagai data store
  karena menjadi penampung sementara sebelum sinkronisasi.

---

## 4. DFD Level 2

### 4.1 Proses 1.0 — Pelayanan Bayi & Balita (dekomposisi)

```mermaid
flowchart LR
    classDef ext fill:#f0f2f5,stroke:#8696a0,color:#111b21
    classDef proc fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef store fill:#ffffff,stroke:#075e54,color:#054c44

    E2["E2 Kader"]:::ext
    E3["E3 Nakes"]:::ext

    P11(("1.1 Pendaftaran<br/>& Identifikasi")):::proc
    P12(("1.2 Penimbangan<br/>& Pengukuran")):::proc
    P13(("1.3 Pencatatan<br/>Klinis")):::proc
    P14(("1.4 Growth Engine<br/>Z-score / N/T / 2T")):::proc
    P15(("1.5 Layanan Rujukan<br/>atau Preventif")):::proc
    P16(("1.6 Simpan &<br/>Sinkronisasi")):::proc

    D6[("D6 Patient")]:::store
    D7[("D7 Measurement")]:::store
    D8[("D8 Antrean lokal")]:::store

    E2 -- "QR / nama / tgl lahir / data baru" --> P11
    D6 -- "daftar pasien posyandu" --> P11
    P11 -- "pasien + kategori<br/>(client-id idempoten)" --> D6
    P11 -- "pasien teridentifikasi" --> P12

    E2 -- "BB, PB/TB, posisi ukur,<br/>LK, LiLA" --> P12
    P12 -- "nilai antropometri" --> P13

    E2 -- "ASI eksklusif,<br/>skrining TB, catatan" --> P13
    D6 -- "tgl lahir, jenis kelamin,<br/>isPregnant" --> P14
    D7 -- "pengukuran bulan sebelumnya" --> P14
    P13 -- "data siap hitung" --> P14

    P14 -- "zWeightAge, zHeightAge,<br/>zWeightHeight, zBmiAge,<br/>status, weightStatus, 2T" --> P16
    P14 -- "status gizi + badge 2T" --> E2
    P14 -- "daftar 2T / berisiko" --> E3

    E3 -- "konseling / surat rujukan" --> P15
    E2 -- "imunisasi, Vitamin A, PMT" --> P15
    P15 -- "tindak lanjut tercatat" --> P16

    P16 -- "patch pengukuran" --> D8
    P16 -- "upsert Measurement<br/>(patientId + bulan)" --> D7
```

### 4.2 Proses 5.0 — Validasi & Sinkronisasi Offline-First

```mermaid
flowchart TB
    classDef ext fill:#f0f2f5,stroke:#8696a0,color:#111b21
    classDef proc fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef store fill:#ffffff,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a

    E2["E2 Kader"]:::ext
    D8[("D8 Antrean lokal<br/>localStorage")]:::store
    D6[("D6 Patient")]:::store
    D7[("D7 Measurement")]:::store

    P51(("5.1 Audit<br/>Kelengkapan")):::proc
    P52(("5.2 Deteksi<br/>Konektivitas")):::proc
    Q52{"5.2a Online?"}:::dec
    P53(("5.3 Flush Antrean<br/>(idempoten)")):::proc
    P54(("5.4 Resolusi<br/>Konflik Versi")):::proc
    P55(("5.5 Validasi &<br/>Simpan Server")):::proc
    P56(("5.6 Susun<br/>Rekapitulasi")):::proc

    E2 -- "buka daftar pasien,<br/>filter status" --> P51
    D6 -- "kelengkapan data" --> P51
    D7 -- "pengukuran bulan berjalan" --> P51
    P51 -- "daftar belum / sebagian / selesai" --> E2
    P51 -- "perlu kirim" --> P52

    D8 -- "antrean tersimpan" --> P52
    E2 -- "status jaringan perangkat" --> P52
    P52 --> Q52
    Q52 -- "offline" --> E2
    E2 -- "kader dilarang logout,<br/>cari sinyal" --> P52
    Q52 -- "online" --> P53

    P53 -- "POST /api/patients<br/>(clientId, force)" --> P55
    P53 -- "POST /api/measurements/autosave<br/>(version = timestamp)" --> P54
    P54 -- "version lebih tua (409)" --> E2
    E2 -- "muat ulang halaman" --> P54
    P54 -- "version diterima" --> P55

    P55 -- "Patient baru /<br/>existing (idempoten)" --> D6
    P55 -- "Measurement upsert<br/>per patientId + bulan" --> D7
    P55 -- "recompute N/T rantai" --> D7
    P55 -- "sukses / drop permanen<br/>(400, 404)" --> P53
    P55 -- "retry (401,403,429,5xx)" --> P53
    P53 -- "antrean tersisa" --> D8

    D7 -- "pengukuran sesi" --> P56
    D6 -- "roster pasien" --> P56
    P56 -- "Excel: Ringkasan,<br/>Daftar Anggota, Detail, Berisiko" --> E2
```

---

## 5. Kamus Aliran Data

| Aliran | Dari → Ke | Muatan |
|---|---|---|
| Data peserta | E1/E2 → 1.1 | nama, tanggal lahir, jenis kelamin, wali, no. HP, alamat, `isPregnant` |
| Hasil ukur | E2 → 1.2/2.0/3.0/4.0 | BB (kg), TB/PB (cm), posisi ukur, LK, LiLA, lingkar perut, tensi, lab POCT, usia kehamilan, skrining, `exclusiveBreastfeeding` |
| Status gizi | 1.4 → D7 | `zWeightAge`, `zHeightAge`, `zWeightHeight`, `zBmiAge`, `underweightStatus`, `stuntingStatus`, `wastingStatus`, `growthRefVersion` |
| Progres berat | 1.4 → D7 | `weightGain`, `weightStatus` (`NAIK`/`TIDAK_NAIK`), `weightFaltering2T` |
| Patch pengukuran | 1.0–4.0 → D8 | `kind`, `id`, `patientId`, `posyanduId`, `clientId`, `payload`, `timestamp` |
| Payload sinkron | D8 → 5.3 | isi patch + `version` = `floor(timestamp/1000)` |
| Respon sinkron | 5.5 → 5.3 | `200 ok` / `400,404` (drop) / `401,403` (retry) / `409` (konflik) / `429,5xx` (retry) |
| Sesi JWT | 8.0 → E2/E4/E5 | `userId`, `username`, `name`, `role`, `healthCenterId`, `posyanduId`, `tokenVersion` |
| Master wilayah | E5 → 7.0 | baris Puskesmas, Kalurahan, Padukuhan, Posyandu |
| Berkas rekap | 5.6/6.0/7.0 → E2/E4/E5 | workbook `.xlsx` (sheet Ringkasan, Daftar Anggota, Detail Pengukuran, Daftar Berisiko) |
| Dump backup | D7 → D9 | arsip `pg_dump -Fc` digzip, retensi 7 harian + 6 bulanan |

---

## 6. Catatan Privasi pada Aliran Data

| Peran | Boleh menerima | Tidak boleh |
|---|---|---|
| Posyandu | data per pasien milik unitnya | data unit lain |
| Puskesmas | data per pasien seluruh posyandu binaan | data di luar binaannya |
| Dinkes | agregat per unit/kabupaten | **nama / identitas pasien** |

Penegakan ada di API (`src/lib/patient-scope.ts`, `src/lib/stats-access.ts`),
bukan sekadar menyembunyikan tombol di UI.
