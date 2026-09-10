# Audit Visualisasi Data — posyandu_digital

> Dokumen ini ditulis **untuk konsumsi agen** (referensi `file:line` presisi, spesifikasi
> actionable). Manusia cukup membaca bagian **Ringkasan Eksekutif** di bawah.
>
> Status: hasil sesi grilling + verifikasi kode. **Belum ada perubahan kode** saat dokumen ini dibuat.
> Bahasa: Indonesia. Peran: `POSYANDU` (kader), `PUSKESMAS` (staf), `DINKES` (super admin).

---

## 0. Ringkasan Eksekutif

**Masalah inti yang ditemukan:** visualisasi yang ada bukan terutama *kurang*, tetapi banyak yang
**salah secara diam-diam** — angka yang tampil tidak mewakili apa yang dipikirkan pembacanya.
Selain itu, fitur yang paling dekat dengan kebutuhan harian kader — **tren pertumbuhan seorang anak
di riwayat pasien** — sama sekali tidak ada; riwayat hanya berupa daftar chip.

**3 temuan terpenting:**

1. **Angka partisipasi salah.** Denominator memakai jumlah pasien *saat ini* untuk *semua* bulan
   lampau, tanpa filter tanggal (`src/lib/analytics.ts:64-71`). Tren bulan-ke-bulan jadi bias.
2. **"Normal" menyesatkan.** Baris pengukuran tanpa indikator klinis apa pun dihitung sebagai
   "Normal" (`src/lib/analytics.ts:295-309`). Anak tanpa data lab ikut terhitung "normal". Ini juga
   menghitung baris, bukan pasien unik → pasien bisa dihitung dobel.
3. **Dashboard menampilkan bulan berjalan yang (biasanya) kosong.** `latestMonth` dihitung dari
   deret bulan yang di-*zero-fill*, jadi selalu bulan berjalan — awal bulan semua unit tampil `0%`
   dan kartu "Normal 0%" (`DinkesAnalisis.tsx:82`, `PuskesmasAnalisis.tsx:48`).

**3 rekomendasi utama:**

1. **Perbaiki korektnya angka dulu** (Wave 1): denominator historis, pemisahan "belum dinilai" vs
   "normal", penetapan "bulan terakhir yang punya data", konsistensi satuan kartu.
2. **Tambah kurva KMS BB/U per-pasien + status N/T/2T** (Wave 2) — inti kebutuhan kader.
3. **Agregasi + daftar pantau 2T** untuk Puskesmas/Dinkes (tanpa menampilkan KMS individual ke
   mereka), memakai guard scope peran yang sudah ada.

**Urutan pengerjaan:** Wave 1 (kebenaran angka) → Wave 2 (KMS + N/T/2T) → Wave 3 (peningkatan).

---

## 1. Definisi "Bermanfaat" per Peran

Visualisasi disebut bermanfaat bila mengubah **keputusan** pembacanya.

| Peran | Keputusan yang harus didukung | Fokus visualisasi |
|---|---|---|
| POSYANDU (kader) | Anak mana yang perlu ditindaklanjuti/ dirujuk/diberi penyuluhan? | **Per-pasien** (KMS, tren N/T, status gizi, riwayat) |
| PUSKESMAS | Posyandu mana yang perlu dibina? Anak mana yang perlu dirujuk? | **Agregat per-posyandu** + daftar pantau |
| DINKES | Wilayah/puskesmas mana yang perlu intervensi? | **Agregat per-wilayah** + daftar pantau |

Konsekuensi desain (hasil grilling):

- KMS individual = **fitur kader** (dan muncul saat Puskesmas/Dinkes drill-down ke pasien).
- Dashboard atas Puskesmas/Dinkes = **agregat**, bukan KMS mentah satu-satu.
- Flag N/T/2T disimpan per-pengukuran sehingga bisa diagregasi & dibatasi sesuai wewenang.

---

## 2. Inventaris Visualisasi Saat Ini

Aplikasi adalah SPA satu-route (`src/app/page.tsx`); tab `beranda`/`analisis`.

### 2.1 Riwayat pasien (`src/components/DynamicMeasurementForm.tsx`)
- Tab "Riwayat" (`:71-72`, `:338-358`) merender daftar chip per tanggal (`:733-813`).
- Hanya menampilkan `stuntingStatus` (TB/U) sebagai status gizi (`:775-780`); `underweightStatus`,
  `wastingStatus`, IMT tidak ditampilkan.
- Data dari `GET /api/patients/{id}` (measurements `orderBy desc`, `patients/[id]/route.ts:17-19`).
- **Tidak ada grafik tren apa pun.**

### 2.2 Analisis agregat (recharts, `src/components/analisis/`)
| Komponen | Peran | Isi |
|---|---|---|
| `GrowthStatusDistribution.tsx` | semua | Donut status gizi per indeks + tren "% masalah" bulanan |
| `DinkesAnalisis.tsx` | DINKES | Tren partisipasi, ranking puskesmas (drill ke posyandu), donut normal/abnormal, bar temuan |
| `PuskesmasAnalisis.tsx` | PUSKESMAS | Tren, ranking posyandu, donut normal/abnormal |
| `PosyanduAnalisis.tsx` | POSYANDU | Tren, donut, daftar pasien abnormal |
| `UnitScoreboard.tsx` | DINKES/PUSKESMAS | Bar ranking partisipasi (CSS) |
| `PeriodControl.tsx` | semua | Preset 6/12/24 bulan + pilih bulan |

### 2.3 Dashboard "beranda"
- `DinkesDashboard.tsx`, `PuskesmasDashboard.tsx`: **angka + daftar** (jumlah puskesmas/posyandu/pasien,
  pengukuran, pending aktivasi). Tidak ada visual.

---

## 3. Temuan (yang Salah / Kurang)

Severity: **P0** = salah/menyesatkan & berdampak tinggi · **P1** = salah/UX penting · **P2** = polish.

### 3.1 Tabel temuan

| ID | Sev | Temuan | Bukti |
|---|---|---|---|
| F1 | P0 | Denominator partisipasi = roster pasien **hari ini** untuk **semua** bulan lampau (tanpa filter tanggal) → tren bias | `src/lib/analytics.ts:64-71` |
| F2 | P0 | Baris tanpa indikator klinis apa pun dihitung "Normal"; menghitung baris, bukan pasien unik | `src/lib/analytics.ts:292-309` |
| F3 | P0 | `appliesTo` indikator **dead code**: indikator diterapkan di luar kategori yang layak (mis. gula darah untuk BALITA) | `src/lib/clinical.ts:36,149-187` |
| F4 | P0 | `latestMonth` Dinkes = bulan terakhir deret zero-fill = bulan berjalan → kartu/ranking `0%` awal bulan | `DinkesAnalisis.tsx:82`, `DinkesAnalisis.tsx:241-255` |
| F5 | P0 | `latestMonth` Puskesmas cacat yang sama | `PuskesmasAnalisis.tsx:48`, `PuskesmasAnalisis.tsx:73-78` |
| F6 | P0 | `latestOutcome` Posyandu = elemen terakhir array **tak terurut** (query tanpa ORDER BY) → bulan arbitrer | `PosyanduAnalisis.tsx:79`, `src/app/api/stats/outcomes/route.ts:64-72`, `analytics.ts:238-259` |
| F7 | P0 | Ringkasan growth mencampur denominator: `total` (per-pengukuran) vs `measured` (per-pasien ∩ terdaftar) → "Berstatus Gizi" bisa > "Terukur" | `src/app/api/stats/growth/route.ts:120-138` |
| F8 | P1 | Tanggal sesi default UTC (`toISOString`) → setelah 17:00 WIB menjadi "besok"; race dengan `todayMeasurement` server | `DynamicMeasurementForm.tsx:68`, `:105-146`, `patients/[id]/route.ts:58-65` |
| F9 | P1 | `flushNow()` no-op saat save sedang berjalan (`busyRef`) → edit tanggal lama bisa tertulis ke tanggal baru | `DynamicMeasurementForm.tsx:247-264`, `offline-sync.ts:304-334` |
| F10 | P1 | Riwayat menyembunyikan metrik bernilai 0 & hanya menampilkan TB/U sebagai status gizi | `DynamicMeasurementForm.tsx:757-780` |
| F11 | P1 | Daftar pasien abnormal Posyandu berjudul "N pasien" padahal 1 baris = 1 indikator; cakupan = seluruh periode, bukan bulan terpilih | `PosyanduAnalisis.tsx:154-188`, `abnormal-patients/route.ts:53-67,89-131` |
| F12 | P1 | Ranking: unit `0%` tampil dengan bar terisi 4%, dan diurutkan worst-first (terbaca sebagai best-first) | `UnitScoreboard.tsx:41-46,55` |
| F13 | P1 | Preset "12 bulan" menghasilkan 13 bucket bulan (label vs sumbu tak cocok) | `PeriodControl.tsx:19-26`, `analytics.ts:197-207` |
| F14 | P1 | `getDefaultDateRange` overflow tanggal akhir bulan (31 → pindah bulan) | `PeriodControl.tsx:22-24` |
| F15 | P1 | Drill-down Dinkes tak di-refresh saat periode diganti → grafik kosong, breadcrumb basi | `DinkesAnalisis.tsx:68-73,114-121` |
| F16 | P1 | Kartu ringkasan mencampur satuan (per-pengukuran vs per-pasien) dalam satu strip | `DinkesAnalisis.tsx:241,255`; `PuskesmasAnalisis.tsx:174,186` |
| F17 | P1 | Empty-state tak pernah aktif karena route coverage selalu zero-fill bulan → unit tanpa data tampil garis nol, bukan "belum ada data" | `coverage/route.ts:132-145`, `DinkesAnalisis.tsx:131`, `PosyanduAnalisis.tsx:102` |
| F18 | P2 | `abnormal-patients` membucketing bulan pakai UTC, sedangkan stats lain pakai `localtime` → pasien bisa muncul beda bulan | `abnormal-patients/route.ts:90`, `analytics.ts:55,242` |
| F19 | P2 | Batas bulan/rentang bergantung timezone server (`new Date(...T00:00:00)` lokal) | `analytics.ts:16-19,197-207` |
| F20 | P2 | Aksesibilitas chart: label Pie tumpang tindih di mobile, tanpa `<Legend>`/`aria-label`; baris `disabled` tak ter-announce | `GrowthStatusDistribution.tsx:98-115`, `UnitScoreboard.tsx:57-60` |
| F21 | P2 | Tren butuh >1 bulan & menyambung garis melintasi bulan tanpa data (tanpa penanda gap) | `GrowthStatusDistribution.tsx:158`, `growth-analytics.ts:106-123` |
| F22 | P1 | Riwayat pasien tidak punya grafik tren pertumbuhan (gap fitur utama) | `DynamicMeasurementForm.tsx:733-813` |
| F23 | P1 | Tidak ada deteksi N/T (naik/tidak naik) & 2T, padahal dibutuhkan KMS/monitoring | tidak ada di `src/` (verifikasi grep) |

### 3.2 Detail P0

**F1 — Denominator partisipasi historis.** Numerator per bulan sudah dibatasi tanggal
(`analytics.ts:51-62`), tetapi denominator `COUNT(id) FROM Patient GROUP BY posyanduId` tanpa filter
(`:64-70`). Untuk bulan 6 bulan lalu, pembaginya adalah pasien yang baru terdaftar bulan ini.
Rekomendasi: hitung denominator "pasien terdaftar pada bulan itu" (pakai `createdAt` pasien ≤ akhir
bulan, atau snapshot terdaftar). Jika `createdAt` pasien tidak cukup akurat, tetapkan aturan eksplisit
dan dokumentasikan; jangan diam-diam memakai roster sekarang.

**F2 — "Normal" palsu & double count.** `classifyOutcomes` menandai `hasAbnormal=false` → `normal++`
untuk setiap baris tanpa indikator terpicu. Anak BALITA yang hanya diukur BB/TB (tanpa lab) tidak
punya nilai lab → seluruhnya "Normal". Selain itu `total++` per baris. Rekomendasi: kategori ketiga
**"Tidak Dinilai/Belum Ada Data"**; hitung **pasien unik** (dedupe pengukuran terakhir per pasien per
bulan) sebagai denominator, konsisten dengan `latestPerPatient` di `growth-analytics.ts:50-57`.

**F3 — `appliesTo` diabaikan.** `checkIndicator` (`clinical.ts:149-180`) tidak pernah membaca
`indicator.appliesTo`, dan `indicatorsForCategory` (`:185-187`) tanpa pemanggil. Akibat: `bloodSugar`
/`cholesterol` anak BALITA bisa tampil sebagai temuan abnormal. Rekomendasi: saring indikator dengan
`appliesTo.includes(category)` di `checkIndicator` atau di pemanggil (`analytics.ts:296`,
`abnormal-patients/route.ts:93`).

**F4/F5/F6 — "Bulan terakhir" salah.** Karena `months` di-*zero-fill* (`analytics.ts:183-193`,
`coverage/route.ts:132-145`), elemen terakhir selalu bulan berjalan. Rekomendasi: buat helper
`latestMonthWithData(rows)` yang mencari bulan terakhir dengan `numerator>0`/`total>0`; pakai di
ketiga dashboard; tampilkan label bulannya. Untuk Posyandu, urutkan `outcomes` per `ym` atau pilih
`Math.max`.

**F7 — Denominator growth campur.** `total` = hasil `statusCounts(latest, indicator)` atas
`latestPerPatient` (semua balita yang punya pengukuran), sedangkan `measured` = ∩ dengan
`registeredBalitaIds(..., toObj)` (umur dihitung pada akhir periode). Seorang anak yang berumur ≤60
bulan saat diukur tetapi >60 bulan pada `to` masuk `total` tapi bukan `measured`. Rekomendasi:
satu definisi himpunan (mis. balita yang terdaftar pada akhir periode) untuk pie dan kartu; pastikan
`total <= registered`.

---

## 4. Spesifikasi Fitur: Kurva KMS + N/T/2T

### 4.1 Aturan (hasil grilling — final)
- Bandingkan berat dengan **pengukuran terukur sebelumnya** (yang benar-benar ada, `weight != null`).
- `TIDAK_NAIK` bila `berat_sekarang <= berat_sebelumnya`; `NAIK` bila lebih besar.
- `2T` = **dua hasil `TIDAK_NAIK` berturut-turut** pada pengukuran yang benar-benar ada. Absen/
  belum ditimbang **tidak** dihitung T dan **tidak** memutus rantai.
- Pengukuran pertama (tak ada pembanding) → status `null` (belum bisa dinilai).
- Absen/belum ditimbang bulan ini: ditandai terpisah, **fase berikut** (di luar Wave 2).

### 4.2 Data model (`prisma/schema.prisma`, model `Measurement` ~`:117-133`)
Tambah kolom (semua nullable agar aman untuk data lama):

```prisma
weightGain        Float?    // delta BB (kg) vs pengukuran terukur sebelumnya
weightStatus      String?   // 'NAIK' | 'TIDAK_NAIK' (null = tidak dapat dinilai)
weightFaltering2T Boolean   @default(false) // true bila 2x TIDAK_NAIK berturut-turut
```

Migrasi: `prisma migrate dev` (Dev) / `migrate deploy` (prod). Ikuti pola dokumentasi backfill
`docs/growth-antropometri.md:160-178`.

### 4.3 Logika komputasi (baru)
Buat modul murni, mis. `src/lib/growth/weight-progression.ts`:

- `computeWeightProgression(prevWeight, currentWeight) -> { gain, status }`
- Fungsi murni → mudah diuji (selaras pola `src/lib/growth/stress.test.ts`).

**Autosave** (`src/app/api/measurements/autosave/route.ts`, setelah `effectiveWeight` ~`:133`):
1. Ambil pengukuran sebelumnya: `patientId` sama, `sessionDate < targetDate`, `weight != null`,
   `orderBy sessionDate desc`, `take 1`.
2. Hitung `gain`, `status`.
3. `2T = status === 'TIDAK_NAIK' && prev.weightStatus === 'TIDAK_NAIK'`.
4. Simpan ketiganya hanya bila `weight !== undefined` (mengikuti pola kalkulasi growth di `:198-219`).

**Penting — edit/backdate.** Mengubah/menghapus satu pengukuran lama mengubah rantai N/T untuk
pengukuran **setelahnya** pada pasien itu. Setelah menyimpan baris tanggal T, hitung ulang rantai
(pengukuran dengan `sessionDate > T`, urut naik) untuk pasien tersebut. Tanpa ini, flag 2T bisa basi.

**Backfill** (perluas `src/app/api/dinkes/backfill-growth/route.ts` atau route baru):
- Iterasi **per pasien**, urut `sessionDate asc`, hitung ulang `weightGain/weightStatus/2T` seluruh baris.
- Mode idempoten; laporkan `updated/skipped`.

### 4.4 Endpoint agregasi (baru)
`GET /api/stats/weight-progression?from=&to=&hcId=` (role-scoped seperti `coverage`):
- `data[]` per posyandu per bulan: `total`, `naik`, `tidakNaik`, `duaT`, `belumDinilai`
  (+ `posyanduName`, `healthCenterId`, `healthCenterName`).
- `faltering[]` = daftar anak `2T` dalam periode (nama, regNumber, posyandu, bulan, berat, delta).
- Guard scope meniru `src/app/api/stats/coverage/route.ts:30-54` (POSYANDU sendiri,
  PUSKESMAS se-HC, DINKES semua + `hcId`).

### 4.5 UI
- **`src/components/KmsChart.tsx` (baru).** BB/U vs umur:
  - Sumbu X umur (bulan), Y berat (kg).
  - Gambar 7 garis SD dari `referenceAt(TABLES['bb-u'], sex, age)`
    (`src/lib/growth/tables.ts:62-70,103-122`) + zona warna KMS (hijau/kuning/merah).
  - Titik = `historyList` pasien; garis pengukuran anak di atas pita.
  - Mobile-first; render dari `historyList` yang sudah diambil (aman offline).
- **Riwayat:** tambah badge `N/T` & `2T` per baris; tampilkan semua status gizi
  (`underweightStatus`, `stuntingStatus`, `wastingStatus`), bukan hanya TB/U.
- **Puskesmas/Dinkes:** kartu agregat "% tidak naik" + daftar pantau `2T` per posyandu/HC.
  KMS individual hanya saat drill-down ke pasien (`page.tsx:184-188`).
- **Kader beranda:** sorot anak `2T` di daftar pasien (chip merah).

### 4.6 Offline & mobile
Tidak menambah dependensi (tetap `recharts`). Semua input KMS berasal dari data yang sudah dimuat /
tabel referensi yang ada di bundle. Tak perlu round-trip jaringan untuk menggambar.

---

## 5. Roadmap Bertahap

### Wave 1 — Perbaikan kebenaran angka (P0)
F1, F2, F3, F4, F5, F6, F7, F16, F17. Fokus: tidak ada angka menyesatkan.
Verifikasi: unit test agregasi + cek manual 1 HC dengan data historis nyata.

### Wave 2 — KMS + N/T/2T (P1 inti)
F22, F23 + spesifikasi §4. Termasuk migrasi DB, backfill, endpoint agregasi, `KmsChart`, badge, watchlist.
Verifikasi: unit test `computeWeightProgression`; backfill idempoten; cek KMS 1 anak vs KMS kertas.

### Wave 3 — Peningkatan (P1 sisa + P2)
F8, F9, F10, F11, F12, F13, F14, F15, F18, F19, F20, F21 + penanda abseb/belum ditimbang.

---

## 6. Kriteria Penerimaan & Verifikasi

| Area | Kriteria |
|---|---|
| Angka (W1) | Partisipasi bulan lampau stabil saat pasien baru ditambah; "Tidak Dinilai" terpisah dari "Normal"; dashboard menampilkan bulan terakhir **yang ada datanya**; `Berstatus Gizi <= Terukur <= Terdaftar` |
| N/T (W2) | `T` untuk berat ≤ sebelumnya; `2T` hanya dua pengukuran T berturut; edit baris lama memicu hitung ulang rantai; backfill idempoten |
| KMS (W2) | Kurva anak tampil dari riwayat; 7 garis SD benar per jenis kelamin/umur; jalan offline |
| Scope (W2) | POSYANDU hanya datanya; PUSKESMAS se-HC; DINKES semua; `hcId` non-DINKES → 403 |
| Kualitas | `npm run lint`, typecheck, dan test yang ada (termasuk `src/lib/growth/stress.test.ts`) lulus |

Perintah cek (sesuaikan bila nama script berbeda — lihat `package.json`):
`npm run lint` · `npm run build` (typecheck) · `npm test`.

---

## 7. Pertanyaan Terbuka (untuk konfirmasi sebelum Wave 2)

1. **Toleransi "naik".** Kita pakai `≤` = tidak naik. Beberapa pedoman menganggap kenaikan sangat
   kecil (mis. <0,1 kg/bulan) sebagai tidak memadai. Pakai biner dulu?
2. **Denominator F1.** `Patient.createdAt` tersedia — boleh dipakai sebagai "tanggal terdaftar" untuk
   denominator historis? Bila tidak akurat untuk data lama, perlu aturan fallback.
3. **KMS TB/U.** Wave 2 hanya BB/U; TB/U menyusul. Konfirmasi.
4. **Absen/belum ditimbang.** Ditandai di Wave 3; pastikan definisi "bulan terlewat" (sejak kapan
   dihitung) sebelum implementasi.
5. **Perbaikan F2.** Menambah kategori "Tidak Dinilai" mengubah tampilan pie & kartu — perlu
   persetujuan produk karena mengubah angka yang selama ini dilihat.

---

## 8. Referensi Kode Kunci

- Agregasi: `src/lib/analytics.ts` · `src/lib/growth-analytics.ts` · `src/lib/clinical.ts`
- Tabel rujukan: `src/lib/growth/tables.ts` · `src/lib/growth/data/*.json` · `docs/growth-antropometri.md`
- API stats: `src/app/api/stats/{coverage,outcomes,growth,abnormal-patients}/route.ts`
- Tulis pengukuran: `src/app/api/measurements/autosave/route.ts` · `src/lib/offline-sync.ts`
- Riwayat pasien: `src/components/DynamicMeasurementForm.tsx` · `src/app/api/patients/[id]/route.ts`
- Dashboard: `src/components/analisis/*.tsx` · `src/components/{Dinkes,Puskesmas}Dashboard.tsx`
- RBAC/scope: `src/lib/api-auth.ts` · `src/app/api/stats/coverage/route.ts:30-54`

---

## 9. Status Implementasi

### Wave 1 — SELESAI (perbaikan kebenaran angka)
| ID | Status | Perubahan |
|---|---|---|
| F1 | ✅ | `fetchCoverageBase` (analytics.ts) menghitung denominator per bulan dari `Patient.createdAt`; unit tanpa ukur tapi punya pasien terdaftar tetap muncul sebagai partisipasi 0% |
| F2 | ✅ | `classifyOutcomes` dedupe per pasien/bulan + kategori `notAssessed` ("Belum Dinilai"); pie 3 segmen |
| F3 | ✅ | `appliesTo` dipakai di `classifyOutcomes` & `abnormal-patients` |
| F4 | ✅ | `latestMonth` Dinkes = bulan terakhir dengan `numerator>0` |
| F5 | ✅ | `latestMonth` Puskesmas idem |
| F6 | ✅ | Posyandu memilih `latestOutcome` dari bulan dengan `total>0` (terurut), + subtitle bulan |
| F7 | ✅ | `stats/growth`: `latest` dibatasi `registeredBalitaIds` → `total ≤ measured ≤ registered` |
| F16 | ✅ | Kartu "Normal %" dihitung dari yang dinilai (normal+abnormal); "Terdaftar" memakai bulan terpilih |
| F17 | ✅ | Empty-state berbasis "tak ada satu pun numerator>0", bukan panjang array zero-fill |

Verifikasi: `npm test` (95 lulus, +4 baru di `src/lib/analytics.test.ts`), `npm run lint` (0 error),
`npm run build` (sukses). **Belum ada migrasi DB** (tidak perlu untuk Wave 1).

Tes baru: `src/lib/analytics.test.ts` (belum dinilai, abnormal, appliesTo, dedupe).

### Wave 2 — SELESAI (KMS BB/U + N/T/2T)
| Item | Status | Perubahan |
|---|---|---|
| Skema | ✅ | `Measurement.weightGain/weightStatus/weightFaltering2T`; diterapkan via `prisma db push` + `prisma generate` |
| Logika murni | ✅ | `src/lib/growth/weight-progression.ts` (+ diekspor dari `growth/index.ts`) |
| Komputasi rantai | ✅ | `src/lib/weight-progression-db.ts`; dipanggil `autosave` (saat berat berubah) & `backfill-growth` |
| Agregasi | ✅ | `GET /api/stats/weight-progression` (data per unit + `faltering[]`, role-scoped) |
| Kurva KMS | ✅ | `src/components/KmsChart.tsx` (BB/U vs umur + 5 garis SD) di tab Riwayat, hanya BALITA |
| Badge N/T & 2T | ✅ | Tab Riwayat (`DynamicMeasurementForm`) + status BB/U & BB/TB kini tampil |
| Watchlist peran atas | ✅ | `WeightProgressionCard.tsx` dipakai di Posyandu/Puskesmas/Dinkes Analisis |

**Catatan operasional:** setelah deploy, isi kolom baru pada data lama dengan salah satu cara:
`npm run db:backfill` (CLI, idempoten, lihat `scripts/backfill-weight-progression.mjs`) **atau**
`POST /api/dinkes/backfill-growth` (khusus DINKES, respons menyertakan `weightUpdated`).
**Kader beranda chip 2T di daftar pasien belum dikerjakan** (butuh query latest-per-patient); masuk Wave 3.

Verifikasi: `npm test` 102 lulus (+7 `weight-progression.test.ts`), `npm run lint` 0 error,
`npm run build` sukses.

### Wave 3 — SEBAGIAN SELESAI
| ID | Status | Perubahan |
|---|---|---|
| F8 | ✅ | `todayLocalISODate()` (utils) menggantikan `toISOString()` UTC di tanggal sesi + `max` (DynamicMeasurementForm, EditPatientModal, QuickRegisterModal) |
| F9 | ✅ | `flushNow()` kini async & menunggu flush berjalan; ganti tanggal sesi menunggu patch lama terkirim |
| F11 | ✅ | Daftar temuan Posyandu: "N pasien · M temuan · bulan", hanya bulan terpilih |
| F12 | ✅ | Ranking: bar 0% tidak lagi terisi; urut tertinggi dulu + nomor urut |
| F13/F14 | ✅ | `periodToRange` = tepat N bucket, mulai tanggal 1 (tanpa overflow) + test regresi |
| F15 | ✅ | Drill-down Dinkes di-refetch saat periode/HC berubah |
| F18 | ✅ | `ym` daftar abnormal pakai waktu lokal (`ymOf`) |
| Chip 2T kader | ✅ | `PatientData.faltering2T` dari pengukuran terbaru; chip merah "2T — perlu rujuk" di `PatientCard` |
| Belum ditimbang | ✅ | BALITA tanpa ukur bulan berjalan → `lastMeasuredAt`/`measuredThisMonth` di `/api/patients`; badge "Belum ditimbang bulan ini" di `PatientCard`; ringkasan cakupan bulan ini (`coverage` dari `/api/stats/weight-progression`) di `WeightProgressionCard` |

| F19 | ✅ | `monthRange` (`analytics.ts`) mem-parse tanggal sebagai **lokal** (`parseLocalDate`), bukan UTC — memperbaiki bucket bulan bergeser di server ber-offset negatif |

**Sisa (belum):** F10 (chip riwayat menyembunyikan nilai 0 — minor), F20 (aksesibilitas chart:
label/legend/aria), F21 (tren menyambung lintasi bulan tanpa data).

**Verifikasi (diperkuat):**
- `src/lib/month-range.test.ts` — loop merah/hijau lintas TZ (`Asia/Jakarta`/`UTC`/`America/New_York`).
- `src/lib/analytics.integration.test.ts` — DB SQLite sementara: `fetchOutcomeBase`+`classifyOutcomes`
  (dedupe/belum-dinilai/`appliesTo`), `fetchCoverageBase` (denominator historis), dan rantai
  `recomputePatientWeightProgression` (N/T/2T + hitung ulang setelah edit pengukuran lama).
- Ops: `npm run db:backfill` ditambahkan ke `package.json` + `DEPLOY-VPS.md` §7.

`npm test` 110 lulus (12 file), `npm run lint` 0 error, `npm run build` sukses.
