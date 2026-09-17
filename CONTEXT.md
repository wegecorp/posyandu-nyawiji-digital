# CONTEXT — Portal Nyawiji

Satu konteks: aplikasi digitalisasi Posyandu Kabupaten Gunungkidul (Next.js + Prisma +
PostgreSQL). Dokumen ini adalah **glosarium + aturan domain**. Keputusan arsitektur ada di
`docs/adr/`.

## Aktor & peran

| Peran | Cakupan data | Bisa apa |
|---|---|---|
| `POSYANDU` (kader) | posyandu sendiri | catat/edit/hapus pengukuran & pasien; export data lengkap |
| `PUSKESMAS` (staf) | semua posyandu binaannya | kelola akun posyandu (buat, nonaktif, hapus kosong, reset pass); export data per pasien |
| `DINKES` (super admin) | seluruh kabupaten | buat Puskesmas; import wilayah; backfill; export **agregat** |

Login kader = cascade Puskesmas → Kalurahan → Posyandu (tanpa username). Staf pakai username.

## Glosarium

- **Kapanewon** — kecamatan. Terisi via seed (`prisma/seed.js`, 18 wilayah). Tidak dibuat dari CSV.
- **Kalurahan / Padukuhan** — desa / dusun di bawah kapanewon.
- **Puskesmas** (`HealthCenter`) — puskesmas pembina; 1 akun staf.
- **Posyandu** — unit layanan di bawah Puskesmas; 1 akun kader.
- **Sesi** — **satu bulan**. Satu pasien maksimal satu pengukuran per bulan. Tanggal
  disimpan kanonik `YYYY-MM-01`. (`ADR-0002`)
- **Kategori siklus hidup** (`PatientCategory`) — turunan dari tanggal lahir (bulan penuh):
  `BAYI` 0–<6 bln · `BALITA_APRAS` 6–<84 bln · `REMAJA` 84–<216 bln · `DEWASA`
  216–<720 bln · `LANSIA` ≥720 bln · `BUMIL` override bila hamil. (`ADR-0002`)
- **Pengukuran** (`Measurement`) — catatan satu sesi: BB/TB + status gizi + skrining + catatan.
- **Status gizi** — Z-score Permenkes 2/2020 (BB/U, TB/U, BB/TB, IMT/U), **hanya 0–60 bulan**.
  Lihat `docs/growth-antropometri.md`. (`ADR-0001`)
- **N/T & 2T** — Naik/Tidak Naik berat vs pengukuran sebelumnya; 2T = dua kali tidak naik
  berturut → perlu rujuk. Hanya untuk **umur 0–60 bln** (KMS, sejalan status gizi);
  sasaran lain `null`. (`ADR-0004`)
- **ASI Eksklusif** — field bulanan, hanya untuk `BAYI` (0–5 bln); berhenti ditanya setelah
  dijawab **Tidak**. (`ADR-0002`)
- **Skrining TB** — field bulanan `BERESIKO` / `TIDAK_BERESIKO`, semua kategori. (`ADR-0003`)
- **Kelengkapan data** — persen field terisi per kategori (`COMPLETION_FIELDS`, masih draf BB & TB).
- **Cakupan/partisipasi** — terukur / terdaftar per bulan; terdaftar historis dari `Patient.createdAt`.
- **Beresiko** — istilah umum untuk temuan: 2T, TB beresiko, atau indikator klinis abnormal
  (hipertensi, anemia, GDS/kolesterol/asam urat tinggi, skrining indra tidak normal).
- **Backfill** — hitung ulang kolom turunan data lama (`POST /api/dinkes/backfill-growth`).

## Aturan kunci

1. **Sesi = bulan.** Lookup pengukuran memakai rentang bulan, bukan hari.
2. **Status gizi & N/T/2T hanya 0–60 bln.** 61–83 bln (`BALITA_APRAS` lanjut) tetap dicatat
   BB/TB, status gizi & N/T/2T kosong. Upgrade = tabel WHO Reference 2007 (belum dikerjakan).
3. **Fail-closed scope.** Sesi tanpa cakupan lokasi ditolak, bukan dikembalikan tanpa filter
   (`src/lib/patient-scope.ts`, `src/lib/stats-access.ts`).
4. **Privasi export.** Nama pasien: POSYANDU & PUSKESMAS saja. DINKES agregat.
5. **Offline-first.** Autosave + antrean lokal (dedupe per pasien+bulan). (`src/lib/offline-sync.ts`)
6. **Agregat murah, data per pasien berat.** Export bernama dibatasi 30 unit / 20.000 baris
   (`src/lib/export-limits.ts`). (komentar `ponytail:` menandai batas & jalur upgrade)

## Peta modul

| Area | Lokasi |
|---|---|
| Halaman SPA tunggal | `src/app/page.tsx` |
| Form pengukuran | `src/components/DynamicMeasurementForm.tsx` |
| Panel export | `src/components/ExportModal.tsx` |
| Dashboard/analisis | `src/components/{Dinkes,Puskesmas}Dashboard.tsx`, `src/components/analisis/*` |
| Agregasi statistik | `src/lib/analytics.ts`, `growth-analytics.ts`, `coverage-analytics.ts` |
| Kategori & label | `src/lib/utils.ts` (`getPatientCategory`), `types.ts` |
| Indikator klinis | `src/lib/clinical.ts` |
| Growth engine | `src/lib/growth/*` |
| Export Excel | `src/lib/member-export.ts`, `src/app/api/stats/report/route.ts` |
| Skema DB | `prisma/schema.prisma` |
| Deploy | `DEPLOY-VPS.md` |

## ADR

Indeks: `docs/adr/README.md`.
