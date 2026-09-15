# ADR 0002 — Kategori siklus hidup Posyandu & field ASI Eksklusif

- Status: Accepted
- Tanggal: 2026-09-15
- Konteks terkait: kelengkapan data per kategori, form pengukuran, export

## Konteks

Aplikasi awalnya memakai kategori `BALITA (<5 th)` / `ANAK (5-9 th)` /
`REMAJA (10-17 th)` / `DEWASA_LANSIA (≥18 th)` / `BUMIL`. Masukan lapangan
memakai kelompok **siklus hidup Posyandu**: Bayi, Balita & Apras, Remaja,
Dewasa, Lansia, plus Ibu Hamil. Kategori lama juga tidak punya tempat untuk
pemantauan **ASI eksklusif** pada bayi.

## Keputusan

1. **Kategori umur = siklus hidup, batas BULAN PENUH** (dihitung dari tanggal
   lahir ke tanggal sesi):
   - `BAYI` `0 ≤ m < 6`
   - `BALITA_APRAS` `6 ≤ m < 84`
   - `REMAJA` `84 ≤ m < 216`
   - `DEWASA` `216 ≤ m < 720`
   - `LANSIA` `m ≥ 720`
   - `BUMIL` override bila `isPregnant && gender ≠ L` (satu pasien satu kategori
     sasaran; indikator relevan sudah masuk `appliesTo` BUMIL).
2. **Satu model data, kategori turunan.** Tidak ada entitas terpisah per
   kelompok. `Measurement.category` tetap disimpan sebagai snapshot historis dan
   dihitung ulang lewat backfill.
3. **ASI Eksklusif** = kolom `Measurement.exclusiveBreastfeeding Boolean?`.
   Ditanyakan hanya untuk `BAYI`; setelah pernah dijawab `Tidak`, tak ditanya
   lagi. `null` = belum/tak berlaku.
4. **Status gizi tetap 0–60 bulan** (tabel Permenkes 2/2020). Anak 61–83 bulan
   (`BALITA_APRAS`) dicatat BB/TB-nya tetapi status gizi kosong. Upgrade =
   tabel WHO Reference 2007 (belum dikerjakan).
5. **Export**: kolom ringkas `ASI Eksklusif` di Roster
   (`Berhenti bulan N` / `Eksklusif 6 bln` / `s/d bulan N`).

## Konsekuensi

- Data lama `Measurement.category` (mis. `ANAK`, `DEWASA_LANSIA`) harus
  di-recompute. Endpoint `POST /api/dinkes/backfill-growth` kini juga menghitung
  ulang kategori (bukan hanya status gizi).
- Field kelengkapan per kategori (`COMPLETION_FIELDS`) masih draf (BB & TB untuk
  semua) — diisi menyusul setelah daftar layanan per kelompok final.
- Ambang anemia `BALITA_APRAS` memakai `<11.0` (kompromi 6 bln–6 th); idealnya
  5–6 th `<11.5` (WHO 5–11 th) — dapat disempurnakan bila perlu.

## Alternatif yang ditolak

- **Kategori umur + flag bumil terpisah:** lebih "benar" secara data tetapi
  menambah kolom & logika; belum dibutuhkan.
- **Pisah entitas Bayi vs Balita/Apras:** tidak ada kebutuhan; bedanya hanya
  field yang tampil (ASI), cukup lewat kategori turunan.
