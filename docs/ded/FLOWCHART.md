# FLOWCHART — Portal Nyawiji

Diagram alur untuk **developer Dinas Kesehatan Kabupaten Gunungkidul** yang akan
meneruskan/mengoperasikan aplikasi.

- **Format**: Mermaid (ter-render otomatis di GitHub, VS Code, dan GitLab). Tidak butuh alat tambahan.
- **Sumber**: kode di repo ini — `PROJECT_POSYANDU/01_DATA_INPUT/*.md`,
  `PROJECT_POSYANDU/03_OUTPUT/BUSINESS_PROCESS_NARRATIVE.md` (7 proses bisnis,
  70 aktivitas, selaras 5 Langkah Posyandu ILP + Permenkes 2/2020), `prisma/schema.prisma`,
  dan route API di `src/app/api/**`.
- **Aturan penulisan**: setiap kotak pada alur sistem dapat ditelusuri ke file kode
  (lihat [Referensi kode](#referensi-kode)).

> Catatan Mermaid: Mermaid tidak punya *swimlane* vertikal resmi. Kolom pelaksana
> disimulasikan dengan `subgraph` per aktor. Bila nanti developer kabupaten butuh
> versi yang bisa di-drag, konversikan ke draw.io.

---

## 1. Legenda & Aktor

### Simbol

| Simbol | Arti | Contoh |
|---|---|---|
| `(( ))` hijau | Mulai (*Start Event*) | kedatangan peserta |
| `(( ))` teal | Selesai (*End Event*) | sesi ditutup |
| `[ ]` abu | Aktivitas / task manual | penimbangan BB |
| `[ ]` hijau muda | Aktivitas otomatis oleh sistem | hitung Z-score |
| `{ }` kuning | Keputusan (*Gateway*) | normal vs berisiko |
| `{ }` merah | Keputusan risiko / penolakan | akses ditolak |
| `[( )]` | Penyimpanan data (*Data Store*) | database, antrean `localStorage` |
| garis putus-putus | Aliran data ke penyimpanan/laporan | simpan / export |

### Aktor

| Aktor | Level | Ringkas |
|---|---|---|
| Orang tua / Peserta | — | membawa balita, ibu hamil, remaja, warga dewasa/lansia |
| Kader Posyandu | Posyandu | pendaftaran, pengukuran, input data, cetak QR, export |
| Tenaga Kesehatan (Bidan/Perawat) | Puskesmas (turun ke Posyandu) | verifikasi klinis, imunisasi, rujukan |
| Staf Puskesmas | Kapanewon | kelola akun posyandu binaan, supervisi read-only, rekap wilayah |
| Admin Dinkes | Kabupaten | master data wilayah, akun puskesmas, backfill, agregat kebijakan |
| Sistem Portal Nyawiji | — | growth engine, offline-sync, agregasi, export |

### Rekayasa kunci yang mempengaruhi semua alur

1. **Sesi = 1 bulan.** Satu pasien maksimal satu pengukuran per bulan. Tanggal kanonik
   `YYYY-MM-01` (lihat `CONTEXT.md`).
2. **Offline-first.** Input disimpan di peramban (`localStorage`) lebih dulu, dikirim menyusul;
   dedupe per `posyandu + pasien + bulan`.
3. **Fail-closed scope.** Sesi tanpa cakupan wilayah **ditolak**, bukan dikembalikan
   tanpa filter (`src/lib/patient-scope.ts`, `src/lib/stats-access.ts`).
4. **Privasi berjenjang.** Nama pasien: Posyandu & Puskesmas saja. Dinkes agregat.

---

## 2. Overview — Siklus Hidup Data End-to-End

```mermaid
flowchart LR
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef end1 fill:#075e54,stroke:#054c44,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef store fill:#f0f2f5,stroke:#075e54,color:#054c44
    classDef out fill:#fbbf24,stroke:#f59e0b,color:#0b141a

    A(("Peserta datang<br/>hari buka Posyandu")):::start
    B["Kader: pendaftaran<br/>scan QR / cari / daftar baru"]:::sys
    C["Kader: ukur & input<br/>BB, TB/PB, LK, LiLA, tensi, lab, skrining"]:::sys
    D["Growth Engine<br/>Z-score 4 indeks, N/T, 2T, kategori umur"]:::sys
    Q{"Ada temuan<br/>berisiko?"}:::out
    R["Nakes: konseling +<br/>rujukan ke Puskesmas"]:::out
    E[("Antrean lokal peramban<br/>localStorage (saat offline)")]:::store
    F[("Database server<br/>Kapanewon..Measurement")]:::store
    G["Agregasi per Posyandu<br/>cakupan, N/T, PTM, skrining"]:::sys
    H["Puskesmas: dashboard wilayah binaan<br/>+ rekap Excel (maks 30 unit / 20.000 baris)"]:::out
    I["Dinkes: agregat kabupaten<br/>(tanpa nama pasien)"]:::out
    J(("Laporan ke<br/>pimpinan daerah")):::end1

    A --> B --> C --> D --> Q
    Q -- tidak --> E
    Q -- ya --> R --> E
    E -. sync otomatis saat online .-> F
    F --> G --> H --> I --> J
```

---

## 3. Proses Bisnis (7 Proses)

### Proses 1 — Pelayanan Bayi & Balita (0–60 bulan, lanjut Apras s.d. 83 bulan)

```mermaid
flowchart TD
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef end1 fill:#075e54,stroke:#054c44,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a
    classDef risk fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    classDef act fill:#f0f2f5,stroke:#8696a0,color:#111b21

    subgraph PESERTA["Peserta / Orang Tua"]
        S1(("Datang ke Posyandu<br/>bawa Buku KIA / QR")):::start
        E1(("Catat Buku KIA,<br/>jadwal bulan depan")):::end1
    end

    subgraph KADER["Kader Posyandu"]
        P1["1. Pendaftaran: scan QR,<br/>cari nama, atau daftar baru"]:::act
        DUMMY1{"Nama + tgl lahir<br/>sudah terdaftar?"}:::dec
        P1b["Pakai pasien yang ada<br/>(hindari data ganda)"]:::act
        P2["2. Penimbangan / pengukuran<br/>BB, PB-TB + posisi, LK, LiLA"]:::act
        P3["3. Input ke aplikasi<br/>ASI eksklusif 0-5 bln, skrining TB"]:::act
    end

    subgraph SISTEM["Sistem"]
        G1["Hitung umur, koreksi posisi ±0,7 cm,<br/>Z-score BB/U, TB/U, BB/TB, IMT/U,<br/>status N/T dan 2T"]:::sys
        Q1{"Status gizi &<br/>2T / TB beresiko?"}:::dec
        SV[("Autosave + sync<br/>Database server")]:::sys
    end

    subgraph NAKES["Tenaga Kesehatan (Bidan/Perawat)"]
        R1["Konseling gizi + Surat Rujukan<br/>ke Puskesmas (PMT pemulihan)"]:::risk
        N1["Imunisasi, Vitamin A, obat cacing,<br/>PMT penyuluhan, edukasi MP-ASI"]:::act
    end

    S1 --> P1 --> DUMMY1
    DUMMY1 -- ya --> P1b --> P2
    DUMMY1 -- belum --> P2
    P2 --> P3 --> G1 --> Q1
    Q1 -- "ya (2T / wasting / stunting / TB)" --> R1 --> SV
    Q1 -- tidak --> N1 --> SV
    SV --> E1
```

**Ambang & aturan:** status gizi hanya 0–60 bulan (61–83 bulan: BB/TB tetap wajib,
Z-score & N/T `null`). 2T = dua kali `TIDAK_NAIK` berturut → wajib rujuk.
Rujukan tercatat di sheet *Daftar Berisiko*.

### Proses 2 — Pelayanan Ibu Hamil (Bumil)

```mermaid
flowchart TD
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef end1 fill:#075e54,stroke:#054c44,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a
    classDef risk fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    classDef act fill:#f0f2f5,stroke:#8696a0,color:#111b21

    subgraph BUMIL["Ibu Hamil"]
        S2(("Datang bawa Buku KIA")):::start
        E2(("Resume Buku KIA<br/>+ jadwal berikutnya")):::end1
    end

    subgraph KADER2["Kader & Bidan Desa"]
        B1["Pendaftaran + aktifkan tanda Bumil"]:::act
        B2["Ukur BB, TB, LiLA, usia kehamilan,<br/>tensi, kadar HB (POCT)"]:::act
        B3["Input ke aplikasi + skrining TB"]:::act
    end

    subgraph SISTEM2["Sistem"]
        G2["Uji ambang risiko:<br/>LiLA kurang dari 23,5 cm,<br/>tensi 140/90 atau lebih, HB kurang dari 11 g/dL"]:::sys
        Q2{"Risiko tinggi<br/>KEK / hipertensi /<br/>anemia / TB?"}:::dec
        SV2[("Autosave + sync")]:::sys
    end

    subgraph NAKES2["Nakes Puskesmas"]
        R2["Rujukan ANC terpadu,<br/>PMT Pemulihan Bumil KEK 90 hari"]:::risk
        N2["Tablet Tambah Darah (TTD),<br/>konseling gizi, senam hamil"]:::act
    end

    S2 --> B1 --> B2 --> B3 --> G2 --> Q2
    Q2 -- ya --> R2 --> SV2
    Q2 -- tidak --> N2 --> SV2
    SV2 --> E2
```

**Darurat:** sistolik ≥ 160 atau diastolik ≥ 110 mmHg → rujukan darurat ke IGD.

### Proses 3 — Pelayanan Usia Sekolah & Remaja (7–17 tahun)

```mermaid
flowchart TD
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef end1 fill:#075e54,stroke:#054c44,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a
    classDef risk fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    classDef act fill:#f0f2f5,stroke:#8696a0,color:#111b21

    subgraph REM["Remaja"]
        S3(("Hadir di Posyandu Remaja")):::start
        E3(("Ringkasan hasil +<br/>agenda bulan depan")):::end1
    end

    subgraph KADER3["Kader"]
        C1["Pendaftaran digital<br/>(kategori REMAJA otomatis)"]:::act
        C2["Ukur BB, TB, lingkar perut, tensi,<br/>tes penglihatan, tes pendengaran, HB"]:::act
        C3["Input parameter & hasil skrining"]:::act
    end

    subgraph SISTEM3["Sistem"]
        G3["Hitung IMT; cek hipertensi,<br/>anemia, skrining indra"]:::sys
        Q3{"Ada indikator<br/>abnormal?"}:::dec
        SV3[("Autosave + sync")]:::sys
    end

    subgraph PETUGAS["Petugas Puskesmas"]
        R3["Konseling khusus +<br/>rujukan ke Puskesmas"]:::risk
        N3["TTD remaja putri,<br/>KIE gizi & reproduksi"]:::act
    end

    S3 --> C1 --> C2 --> C3 --> G3 --> Q3
    Q3 -- ya --> R3 --> SV3
    Q3 -- tidak --> N3 --> SV3
    SV3 --> E3
```

**Darurat:** HB < 8 g/dL → koordinasi orang tua + rujuk dokter Puskesmas.

### Proses 4 — Pelayanan Usia Produktif & Lansia (PTM)

```mermaid
flowchart TD
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef end1 fill:#075e54,stroke:#054c44,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a
    classDef risk fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    classDef act fill:#f0f2f5,stroke:#8696a0,color:#111b21

    subgraph WARGA["Warga Dewasa / Lansia"]
        S4(("Hadir di meja pendaftaran")):::start
        E4(("Hasil pemeriksaan +<br/>jadwal bulan depan")):::end1
    end

    subgraph KADER4["Kader & Nakes"]
        D1b["Verifikasi identitas / scan QR<br/>(kategori DEWASA atau LANSIA otomatis)"]:::act
        D2b["Ukur BB, TB, lingkar perut, tensi,<br/>skrining indra, lab POCT"]:::act
        D3b["Input semua hasil ke aplikasi"]:::act
    end

    subgraph SISTEM4["Sistem"]
        G4["Bandingkan ambang:<br/>tensi 140/90, GDS 126, kolesterol 200,<br/>asam urat L 7,0 / P 6,0 mg/dL"]:::sys
        Q4{"Indikator<br/>di luar batas?"}:::dec
        SV4[("Autosave + sync")]:::sys
    end

    subgraph NAKES4["Nakes Puskesmas"]
        R4["Konsultasi awal + rujukan<br/>ke Poli Umum Puskesmas"]:::risk
        N4["Edukasi CERDIK / GERMAS,<br/>senam lansia, diet GGL"]:::act
    end

    S4 --> D1b --> D2b --> D3b --> G4 --> Q4
    Q4 -- ya --> R4 --> SV4
    Q4 -- tidak --> N4 --> SV4
    SV4 --> E4
```

**Krisis:** sistolik ≥ 180 atau diastolik ≥ 120 mmHg, atau GDS ≥ 300 mg/dL →
stabilisasi awal + rujuk UGD.

### Proses 5 — Validasi, Sinkronisasi Offline-First & Rekapitulasi

```mermaid
flowchart TD
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef end1 fill:#075e54,stroke:#054c44,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a
    classDef risk fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    classDef act fill:#f0f2f5,stroke:#8696a0,color:#111b21
    classDef store fill:#f0f2f5,stroke:#075e54,color:#054c44

    S5(("Penutupan hari buka<br/>Posyandu")):::start
    A1["Audit kelengkapan:<br/>filter Belum / Diukur Sebagian / Selesai"]:::act
    A2["Periksa antrean lokal<br/>+ status jaringan"]:::sys
    Q5{"Perangkat<br/>online?"}:::dec
    OF1["Simpan di antrean lokal (localStorage).<br/>Kader DILARANG logout;<br/>cari area bersinyal."]:::risk
    ON1["Flush antrean ke API:<br/>validasi idempotensi client-id,<br/>dedupe pasien + bulan"]:::act
    Q5b{"Ada konflik<br/>versi 409?"}:::dec
    CF1["Tampilkan Data Bentrok -<br/>Muat Ulang (last-write-wins)"]:::risk
    DB5[("Database server<br/>konsisten, antrean 0")]:::store
    EX1["Buka panel Export:<br/>pilih periode, cek preview count"]:::act
    EX2["Unduh Excel 4 sheet:<br/>Ringkasan, Daftar Anggota,<br/>Detail Pengukuran, Daftar Berisiko"]:::act
    E5(("Serahkan ke Puskesmas<br/>+ arsip")):::end1

    S5 --> A1 --> A2 --> Q5
    Q5 -- tidak --> OF1 --> A2
    Q5 -- ya --> ON1 --> Q5b
    Q5b -- ya --> CF1 --> DB5
    Q5b -- tidak --> DB5
    DB5 --> EX1 --> EX2 --> E5
```

### Proses 6 — Pembinaan Wilayah & Pengelolaan Akun oleh Puskesmas

```mermaid
flowchart TD
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef end1 fill:#075e54,stroke:#054c44,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a
    classDef risk fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    classDef act fill:#f0f2f5,stroke:#8696a0,color:#111b21
    classDef store fill:#f0f2f5,stroke:#075e54,color:#054c44

    subgraph STAF["Staf Puskesmas"]
        S6(("Buka Portal Nyawiji")):::start
        L6["Login username instansi<br/>(contoh pkm_wonosari1) + password"]:::act
        M6["Pantau dashboard wilayah binaan:<br/>partisipasi, status gizi, 2T, PTM"]:::act
        AN6["Analisis kebutuhan intervensi"]:::act
        Q6{"Pilih modul tindakan"}:::dec
        AU6["Jalur A: Buka Meja<br/>(mode read-only)"]:::act
        AK6["Jalur B: kelola akun posyandu:<br/>buat baru, reset password,<br/>nonaktifkan"]:::act
        RK6["Jalur C: Rekap Wilayah<br/>(maks 30 unit / 20.000 baris)"]:::act
        E6(("Lokakarya Mini:<br/>umpan balik ke kader")):::end1
    end

    subgraph SISTEM6["Sistem"]
        Q6b{"Posyandu punya<br/>data pasien?"}:::dec
        NO6["Tolak hapus permanen -<br/>tawarkan Nonaktifkan Akun"]:::risk
        DB6[("Simpan perubahan akun")]:::store
    end

    S6 --> L6 --> M6 --> AN6 --> Q6
    Q6 -- supervisi --> AU6 --> DB6
    Q6 -- akun --> AK6 --> Q6b
    Q6 -- rekap --> RK6 --> DB6
    Q6b -- ya --> NO6 --> DB6
    Q6b -- tidak --> DB6
    DB6 --> E6
```

**Batas wewenang:** Puskesmas hanya boleh mereset akun Posyandu di
`healthCenterId` yang sama. Reset menaikkan `tokenVersion` → semua sesi lama tercabut.
Penonaktifan juga menaikkan `tokenVersion` dan menolak login berikutnya.

### Proses 7 — Tata Kelola Master Data & Agregasi Kebijakan (Dinkes)

```mermaid
flowchart TD
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef end1 fill:#075e54,stroke:#054c44,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a
    classDef act fill:#f0f2f5,stroke:#8696a0,color:#111b21
    classDef store fill:#f0f2f5,stroke:#075e54,color:#054c44

    subgraph DINKES["Admin Dinkes"]
        S7(("Buka Portal Nyawiji")):::start
        L7["Login super admin (dinkes_gk)<br/>atau bootstrap dari env bila DB kosong"]:::act
        M7["Dashboard agregat kabupaten:<br/>18 Kapanewon, 30 Puskesmas"]:::act
        AN7["Analisis kebijakan (agregat,<br/>tanpa nama pasien)"]:::act
        Q7{"Pilih modul"}:::dec
        IM7["Jalur A: Import master wilayah<br/>(CSV / Excel, opsional dry-run)"]:::act
        BF7["Jalur B: Backfill Growth Engine<br/>hitung ulang Z-score + N/T + 2T"]:::act
        EX7["Jalur C: Export rekap agregat<br/>kabupaten"]:::act
        E7(("Laporan ke Kepala Dinas,<br/>Bupati, Kemenkes")):::end1
    end

    subgraph SISTEM7["Sistem"]
        VAL7["Validasi file: ekstensi xlsx/xls/csv,<br/>ukuran maks 5 MB, cari header"]:::sys
        IMP7["Per baris: cocokkan Puskesmas -><br/>buat HealthCenter + akun staf,<br/>upsert Kalurahan, buat Posyandu + akun kader"]:::sys
        BF7b["Batch 500 pengukuran -><br/>tulis ulang kolom z* & status*;<br/>lalu recompute N/T per pasien"]:::sys
        DB7[("Database server")]:::store
    end

    S7 --> L7 --> M7 --> AN7 --> Q7
    Q7 -- wilayah --> IM7 --> VAL7 --> IMP7 --> DB7
    Q7 -- algoritma --> BF7 --> BF7b --> DB7
    Q7 -- laporan --> EX7 --> DB7
    DB7 --> E7
```

**Idempotensi import:** Posyandu yang sudah ada (kombinasi Puskesmas + Kalurahan +
nama + padukuhan) dilewati; aman dijalankan ulang saat file wilayah berubah.

---

## 4. Alur Sistem Teknis (6 Alur)

### 4.1 Login Kader (cascade) & Aktivasi Wajib Ganti Password

```mermaid
flowchart TD
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef end1 fill:#075e54,stroke:#054c44,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a
    classDef risk fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    classDef act fill:#f0f2f5,stroke:#8696a0,color:#111b21
    classDef store fill:#f0f2f5,stroke:#075e54,color:#054c44

    S(("Buka aplikasi")):::start
    Q{"Jenis akun?"}:::dec
    K1["Kader: pilih Puskesmas,<br/>Kalurahan, Posyandu"]:::act
    K2["Masukkan password Posyandu"]:::act
    ST1["Staf: masukkan<br/>username + password"]:::act
    RL{"Kena rate-limit?<br/>(20 percobaan / menit)"}:::dec
    RL1["Tolak 429:<br/>terlalu banyak percobaan"]:::risk
    LOOK["Cari user + verifikasi<br/>password (bcrypt)"]:::sys
    Q2{"Password benar<br/>dan akun aktif?"}:::dec
    NO["Tolak 401/403<br/>(password salah / dinonaktifkan)"]:::risk
    Q3{"mustChangePassword?"}:::dec
    ACT["Kembalikan needsActivation<br/>TANPA sesi - paksa ganti password"]:::sys
    ACT2["Ganti password (min 8 karakter)<br/>-> /api/auth/activate"]:::act
    ISS["Terbit JWT HS256 (24 jam)<br/>+ cookie posyandu_session<br/>(HttpOnly, SameSite=Lax, Secure bila HTTPS)"]:::sys
    DBS[("tokenVersion<br/>di tabel User")]:::store
    E(("Masuk aplikasi")):::end1
    CHK["Setiap request: verifikasi JWT,<br/>cocokkan tokenVersion + disabledAt"]:::sys
    NO2["401 - sesi dicabut,<br/>login ulang"]:::risk

    S --> Q
    Q -- kader --> K1 --> K2 --> RL
    Q -- staf --> ST1 --> RL
    RL -- ya --> RL1
    RL -- tidak --> LOOK --> Q2
    Q2 -- tidak --> NO
    Q2 -- ya --> Q3
    Q3 -- ya --> ACT --> ACT2 --> ISS
    Q3 -- tidak --> ISS
    ISS --> E
    CHK -. bandingkan .-> DBS
    CHK -- tidak cocok --> NO2
```

**Kunci keamanan:** `tokenVersion` naik saat ganti password, reset oleh admin, atau
akun dinonaktifkan → seluruh sesi lama otomatis mati.

### 4.2 Autosave → Antrean Lokal (localStorage) → Sinkronisasi

```mermaid
flowchart TD
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a
    classDef risk fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    classDef act fill:#f0f2f5,stroke:#8696a0,color:#111b21
    classDef store fill:#f0f2f5,stroke:#075e54,color:#054c44

    S(("Kader mengubah field<br/>(BB, TB, tensi, ...)")):::start
    D["Kumpulkan field (pending).<br/>Debounce 600 ms"]:::act
    Q1{"navigator.onLine?"}:::dec
    QC["Masukkan ke antrean lokal<br/>kunci: posyandu + pasien + BULAN"]:::store
    POST["POST /api/measurements/autosave<br/>(timeout 10 detik, version = timestamp)"]:::sys
    Q2{"Hasil?"}:::dec
    OK1["Tersimpan Otomatis"]:::sys
    QO["Tersimpan Offline"]:::act
    C409["409: data usang.<br/>Status error + minta Muat Ulang"]:::risk
    SV["Server: cek pasien milik posyandu sesi,<br/>validasi nilai, hitung growth,<br/>last-write-wins, upsert per bulan,<br/>recompute rantai N/T bila berat berubah"]:::sys
    EV["Event online / app dibuka:<br/>flushSyncQueue()"]:::act
    Q3{"Kode respons item"}:::dec
    DONE["Buang item (sukses /<br/>invalid 400 / sudah terhapus 404)"]:::sys
    KEEP["Tahan item + sisanya<br/>(jaringan, 401/403, 429, 5xx)"]:::act
    CONF["409 measurement:<br/>buang + laporkan konflik ke UI"]:::risk

    S --> D --> Q1
    Q1 -- offline --> QC --> QO
    Q1 -- online --> POST --> Q2
    Q2 -- ok --> OK1
    Q2 -- 409 --> C409
    Q2 -- "jaringan / timeout" --> QC
    POST -. ditangani server .-> SV
    QC -. saat online .-> EV --> Q3
    Q3 -- sukses --> DONE
    Q3 -- "401/403, 429, 5xx" --> KEEP
    Q3 -- "400 / 404" --> DONE
    Q3 -- "409 measurement" --> CONF
```

**Detail penting** (`src/lib/offline-sync.ts`):

- Kunci dedupe pengukuran = `m:posyanduId:patientId:YYYY-MM`. Edit pada dua tanggal
  berbeda di **bulan sama** digabung; bulan berbeda tidak. Karena itu, data yang
  diinput saat pemeliharaan tidak hilang selama kader **tidak logout**.
- Item yang gagal (bukan permanen) **ditahan** dan seluruh antrean di belakangnya
  ikut ditahan sampai berhasil — mencegah urutan terbalik.
- Registrasi pasien offline pakai `clientId` (UUID) sebagai idempotensi: retry tidak
  membuat dobel.

### 4.3 Export Excel per Peran

```mermaid
flowchart TD
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef end1 fill:#075e54,stroke:#054c44,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a
    classDef risk fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    classDef act fill:#f0f2f5,stroke:#8696a0,color:#111b21

    S(("Buka panel Export")):::start
    P["Pilih periode + unit posyandu"]:::act
    SCP["resolveReportPosyanduIds - fail-closed:<br/>POSYANDU dirinya; PUSKESMAS binaan saja;<br/>DINKES semua"]:::sys
    Q1{"Sesi punya<br/>cakupan unit?"}:::dec
    DENY["403 Akses ditolak"]:::risk
    Q2{"Menyertakan<br/>data per pasien?"}:::dec
    Q3{"Lebih dari 30 unit<br/>atau lebih dari 20.000 baris?"}:::dec
    TOOBIG["400 - persempit periode<br/>atau pilihan posyandu"]:::risk
    AGG["Dinkes: hanya agregat<br/>(tanpa nama pasien)"]:::sys
    GEN["Susun workbook Excel"]:::sys
    S1["Sheet Ringkasan (agregat)"]:::sys
    S2["Sheet per unit + Daftar Anggota"]:::sys
    S3["Sheet Detail Pengukuran"]:::sys
    S4["Sheet Daftar Berisiko<br/>(2T, TB, PTM, rujukan)"]:::sys
    E(("Unduh berkas .xlsx")):::end1

    S --> P --> SCP --> Q1
    Q1 -- tidak --> DENY
    Q1 -- ya --> Q2
    Q2 -- tidak --> AGG --> GEN
    Q2 -- ya --> Q3
    Q3 -- ya --> TOOBIG
    Q3 -- tidak --> GEN
    GEN --> S1 --> S2 --> S3 --> S4 --> E
```

### 4.4 Reset Password Kader oleh Puskesmas/Dinkes

```mermaid
flowchart TD
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef end1 fill:#075e54,stroke:#054c44,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a
    classDef risk fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    classDef act fill:#f0f2f5,stroke:#8696a0,color:#111b21

    S(("Puskesmas/Dinkes<br/>tekan tombol Reset Password")):::start
    RL{"Rate-limit 10/menit?"}:::dec
    RL1["429 - coba lagi nanti"]:::risk
    AU["requireAuth + pembatasan peran:"]:::sys
    Q1{"Peran pemanggil?"}:::dec
    NO1["403 - Posyandu tidak berwenang<br/>mereset akun lain"]:::risk
    Q2{"Puskesmas: target Posyandu<br/>di binaannya?"}:::dec
    NO2["403 - bukan binaan /<br/>bukan akun Posyandu"]:::risk
    Q3{"Dinkes: target akun Dinkes lain?"}:::dec
    NO3["403 - tidak boleh"]:::risk
    ACT["Set password = default per peran,<br/>mustChangePassword = true,<br/>tokenVersion + 1"]:::sys
    E(("Kader login -> aktivasi<br/>ganti password")):::end1

    S --> RL
    RL -- ya --> RL1
    RL -- tidak --> AU --> Q1
    Q1 -- Posyandu --> NO1
    Q1 -- Puskesmas --> Q2
    Q1 -- Dinkes --> Q3
    Q2 -- tidak --> NO2
    Q2 -- ya --> ACT
    Q3 -- ya --> NO3
    Q3 -- tidak --> ACT
    ACT --> E
```

### 4.5 Import Master Wilayah (Dinkes)

```mermaid
flowchart TD
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef end1 fill:#075e54,stroke:#054c44,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a
    classDef risk fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    classDef act fill:#f0f2f5,stroke:#8696a0,color:#111b21

    S(("Dinkes unggah file<br/>xlsx / xls / csv")):::start
    VAL["Validasi: ukuran 1 B - 5 MB,<br/>ekstensi benar, cari baris header"]:::sys
    Q0{"Header<br/>ditemukan?"}:::dec
    NO0["400 - kolom wajib tidak ada"]:::risk
    QD{"Parameter dry=1?<br/>(analisis saja)"}:::dec
    LOOP["Untuk tiap baris:"]:::act
    Q1{"Puskesmas<br/>sudah ada?"}:::dec
    DER["Simpulkan Kapanewon dari nama.<br/>Gagal -> catat error, lewati baris"]:::risk
    MK["Buat HealthCenter +<br/>akun staf Puskesmas (transaksi)"]:::sys
    KAL["Upsert Kalurahan<br/>per Kapanewon"]:::sys
    Q2{"Nama Posyandu<br/>kosong?"}:::dec
    SKIP["Hanya menambah Kalurahan"]:::act
    Q3{"Posyandu sudah ada?<br/>(Puskesmas+Kalurahan+nama+padukuhan)"}:::dec
    DUP["Lewati (idempoten)"]:::act
    MKP["Buat Posyandu +<br/>akun kader (transaksi),<br/>password default Posyandu"]:::sys
    REP["Laporan: dibuat / dilewati / error"]:::sys
    E(("Selesai")):::end1

    S --> VAL --> Q0
    Q0 -- tidak --> NO0
    Q0 -- ya --> QD
    QD -- ya --> LOOP
    QD -- tidak --> LOOP
    LOOP --> Q1
    Q1 -- tidak --> DER --> MK --> KAL
    Q1 -- ya --> KAL
    KAL --> Q2
    Q2 -- ya --> SKIP --> REP
    Q2 -- tidak --> Q3
    Q3 -- ya --> DUP --> REP
    Q3 -- tidak --> MKP --> REP
    REP --> E
```

**Normalisasi nama** (`src/lib/names.ts`): angka romawi dipertahankan kapital
(`Puskesmas Wonosari II`, bukan `... Ii`). Akun staf dibuat otomatis dari nama
(contoh `pkm_semanu1`).

### 4.6 Backfill Growth Engine (Dinkes)

```mermaid
flowchart TD
    classDef start fill:#25d366,stroke:#128c7e,color:#fff
    classDef end1 fill:#075e54,stroke:#054c44,color:#fff
    classDef sys fill:#e7fceb,stroke:#075e54,color:#054c44
    classDef dec fill:#fbbf24,stroke:#f59e0b,color:#0b141a
    classDef act fill:#f0f2f5,stroke:#8696a0,color:#111b21

    S(("POST /api/dinkes/backfill-growth<br/>(khusus Dinkes)")):::start
    AUTH["Cek peran DINKES"]:::sys
    BATCH["Ambil 500 pengukuran<br/>(order by id, cursor)"]:::sys
    ROW["Per pengukuran: hitung ulang kategori umur"]:::sys
    G["computeGrowth: Z-score 4 indeks"]:::sys
    Q1{"Usia 0-60 bulan<br/>dan data lengkap?"}:::dec
    W1["Tulis zWeightAge, zHeightAge,<br/>zWeightHeight, zBmiAge,<br/>status gizi, refVersion"]:::sys
    W2["Catat sebagai skipped<br/>(z dibiarkan kosong)"]:::act
    Q2{"Batch habis?"}:::dec
    WEIGHT["Untuk setiap pasien:<br/>recomputePatientWeightProgression<br/>(N/T & 2T urut tanggal)"]:::sys
    E(("Respons: updated, skipped,<br/>weightUpdated")):::end1

    S --> AUTH --> BATCH --> ROW --> G --> Q1
    Q1 -- ya --> W1 --> Q2
    Q1 -- tidak --> W2 --> Q2
    Q2 -- belum --> BATCH
    Q2 -- sudah --> WEIGHT --> E
```

**Idempoten:** aman dijalankan berulang. Dipakai saat standar antropometri berubah
atau setelah kolom turunan ditambahkan.

---

## 5. Matriks Hak Akses

Ditegakkan di API (`src/lib/api-auth.ts`, `src/lib/patient-scope.ts`,
`src/lib/stats-access.ts`), bukan hanya menyembunyikan tombol.

| Aksi | Posyandu (Kader) | Puskesmas (Staf) | Dinkes (Admin) |
|---|---|---|---|
| Lihat data pasien bernama | Posyandu sendiri | Semua posyandu binaan | **Tidak** (agregat saja) |
| Tambah / ubah pasien | Ya | **Read-only** | Tidak |
| Input pengukuran | Ya | Read-only (Buka Meja) | Tidak |
| Export data per pasien | Posyandu sendiri | Binaan, maks 30 unit / 20.000 baris | Tidak |
| Export agregat | Ya (unit sendiri) | Ya (binaan) | Ya (kabupaten, s/d 24 bulan) |
| Buat / nonaktifkan Posyandu | Tidak | Ya (binaan) | Ya (semua) |
| Reset password | Tidak | Posyandu binaan | Puskesmas & Posyandu |
| Import master wilayah | Tidak | Tidak | Ya |
| Backfill growth engine | Tidak | Tidak | Ya |
| Kelola Kapanewon/Kalurahan | Tidak | Tidak | Ya (via import) |

---

## 6. Lampiran — Pemetaan Simbol BPMN ke Mermaid

| BPMN | Mermaid di dokumen ini |
|---|---|
| Start Event | `((Mulai))` dengan `classDef start` |
| End Event | `((Selesai))` dengan `classDef end1` |
| Task manual | `[ ]` (`classDef act`) |
| Task sistem | `[ ]` hijau muda (`classDef sys`) |
| Exclusive Gateway | `{ }` kuning (`classDef dec`) |
| Peringatan / jalur risiko | `{ }` atau `[ ]` merah (`classDef risk`) |
| Data Store | `[( )]` (`classDef store`) |
| Sub Process | subgraph tersendiri |
| Sequence Flow | `-->` atau `-->|label|` |
| Association (ke penyimpanan) | `-.->` |
| Swimlane / Pool | `subgraph` per aktor |

---

## Referensi kode

| Alur | File |
|---|---|
| Kunci sesi & JWT | `src/lib/session.ts` |
| Verifikasi sesi + peran | `src/lib/api-auth.ts` |
| Cakupan pasien (fail-closed) | `src/lib/patient-scope.ts` |
| Batas export | `src/lib/export-limits.ts` |
| Offline-sync & autosave | `src/lib/offline-sync.ts` |
| Simpan pengukuran (server) | `src/app/api/measurements/autosave/route.ts` |
| Registrasi pasien + dedupe | `src/app/api/patients/route.ts` |
| Growth engine | `src/lib/growth/` |
| Progres N/T & 2T | `src/lib/weight-progression-db.ts` |
| Import wilayah | `src/app/api/dinkes/import/route.ts` |
| Backfill | `src/app/api/dinkes/backfill-growth/route.ts` |
| Reset password | `src/app/api/auth/reset-password/route.ts` |
| Status akun posyandu | `src/app/api/posyandus/[posyanduId]/status/route.ts` |
| Export Excel | `src/app/api/stats/report/route.ts`, `src/lib/member-export.ts` |
| Skema database | `prisma/schema.prisma` |

Dokumen terkait: `docs/ded/DFD.md` (aliran data), `docs/ded/ERD.md` (relasi tabel),
`docs/ded/DED.md` (desain teknis), `CONTEXT.md` (glosarium domain).
