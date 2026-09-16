# ADR 0004 — Cakupan N/T & 2T terbatas umur 0–60 bulan (Permenkes 2/2020 + KMS)

- Status: Accepted
- Tanggal: 2026-09-17
- Konteks terkait: growth, form pengukuran, analisis, export, backfill

## Konteks

Fitur N/T (Naik/Tidak Naik berat) & 2T (dua kali tidak naik → rujuk) sebelumnya
digerbangi oleh **kategori siklus hidup** `BAYI` + `BALITA_APRAS`
(`supportsWeightFaltering`), yaitu 0–83 bulan. Akibatnya:

1. Anak `BALITA_APRAS` umur 61–83 bulan tetap punya N/T/2T padahal status gizi
   (Permenkes 2/2020) dan kurva KMS sudah berhenti di 60 bulan — flag "mengambang"
   tanpa konteks gizi.
2. N/T (bukan 2T) dihitung untuk **semua** kategori: remaja, dewasa, lansia, bumil
   ikut mendapat label "T" (mis. dewasa 44,9 → 44,3 kg). Agregat "% tidak naik" jadi
   tercampur sasaran non-anak.

Permenkes 2/2020 mengatur status gizi (Z-score) untuk 0–60 bulan; N/T/2T sendiri
adalah aturan **KMS** (pemantauan pertumbuhan), yang juga berlaku 0–60 bulan.

## Keputusan

1. **Cakupan N/T & 2T = umur 0–60 bulan penuh saat pengukuran**, dihitung dari
   `birthDate` + `sessionDate` (fungsi `isKmsAge`), **bukan** kategori sasaran.
2. Di luar cakupan → `weightGain`, `weightStatus` = `null`, `weightFaltering2T` = `false`.
   Satu fungsi `computeWeightProgression` mengembalikan semua null bila tidak eligible,
   sehingga write path (autosave/recompute) & backfill seragam.
3. **Kurva KMS** tampil selama pasien punya ≥1 pengukuran berat umur 0–60; grafik
   di-cap 60 bulan. Riwayat kurva tidak hilang saat anak menua (hanya titik baru
   umur >60 yang tidak dinilai).
4. **Badge N/T/2T** per baris riwayat mengikuti umur sesi tersebut — baris lama
   (0–60 bln) tetap tampil selamanya.
5. Data lama dibersihkan idempoten via `npm run db:backfill` (atau
   `POST /api/dinkes/backfill-growth`).
6. Label export "Berat Naik/Tidak" & "2T" dikosongkan untuk non-KMS.

## Konsekuensi

- Apras umur 61–83 bulan tidak lagi punya N/T/2T (tetap dicatat BB/TB; status gizi
  memang sudah kosong). `Balita Total` pada rekap tetap berbasis kategori — di luar
  lingkup N/T.
- Tidak ada migrasi skema (kolom sudah nullable).
- Satu sumber aturan (`isKmsAge`) dipakai write path, read path, export, dan backfill.
- Perbaikan angka: agregat "% tidak naik" & daftar 2T kini hanya sasaran KMS.

## Alternatif yang ditolak

- **Tetap kategori Bayi + Balita/Apras (0–83 bln):** tidak konsisten dengan batas
  status gizi/KMS; anak 61–83 bln punya flag tanpa konteks.
- **Sembunyikan N/T hanya di tampilan (simpan tetap):** menyisakan data menyesatkan
  dan logic bercabang (tech debt).
- **Hitung N/T netral untuk semua kategori:** state ambigu; tak ada konsumen yang
  butuh N/T dewasa (indikator klinis sudah menanganinya).
