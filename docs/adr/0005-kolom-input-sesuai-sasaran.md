# ADR 0005 — Kolom input pengukuran menyesuaikan kelompok sasaran

- Status: Accepted
- Tanggal: 2026-09-18
- Konteks terkait: form pengukuran, clinical.ts `appliesTo`, analisis PTM

## Konteks

Form pengukuran menampilkan section **Laboratorium Sederhana** (Gula Darah,
Kolesterol Total, Asam Urat, Hemoglobin) untuk **semua** kategori. Akibatnya
bayi/balita ikut melihat kolom kolesterol, asam urat, dan GDS yang tidak
relevan. Section lain di-gate ad-hoc dengan `isUnderFive` / `category === ...`.

Padahal kebijakan sasaran per indikator sudah ada di `clinical.ts`
(`INDICATORS.appliesTo`) dan dipakai menu Analisis, export, serta
`abnormal-patients`. Form tidak membacanya, sehingga berpotensi menampilkan
kolom yang justru diabaikan analitik (kelas bug F3 di
`docs/audit-visualisasi.md`).

Dasar kebijakan:
- **Permenkes No. 2 Tahun 2020** — Standar Antropometri Anak (BB, PB/TB, LK,
  IMT/U). `peraturan.bpk.go.id/Details/152505`.
- **Permendagri No. 13 Tahun 2024** — Posyandu dengan sasaran siklus hidup.
- **Posyandu ILP 5 Langkah** — data per sasaran: IMT, tensi, gula darah, mata,
  telinga, TBC, anemia (remaja/dewasa/lansia); BB, TB, gizi, TBC (balita).
- Ambang klinis: WHO 2021 (HB), PERKENI 2019, ATP III, EULAR/ACR.

## Keputusan

1. **`src/lib/measurement-fields.ts` = satu sumber kebenaran** field → sasaran.
   Field klinis **diturunkan** dari `INDICATORS.appliesTo`; field antropometri
   (BB, TB, posisi, LK, LiLA, lingkar perut, usia kehamilan, ASI) didefinisikan
   eksplisit.
2. **Form hanya menampilkan field yang berlaku** (`fieldAppliesTo`), dan
   menyembunyikan section bila kosong. Bayi/Balita hanya melihat HB pada
   section lab; GDS/Kolesterol/Asam Urat hanya Remaja/Dewasa/Lansia.
3. **LiLA**: Balita & Apras, Remaja, Dewasa, Lansia, Bumil (KEK). **Lingkar
   perut**: Dewasa & Lansia (obesitas sentral/PTM).
4. **Kategori dihitung live** dari `birthDate` + bulan sesi (via
   `getPatientCategory`), bukan snapshot `patient.category` saat ini. Mengubah
   tanggal lahir / memilih sesi lampau otomatis mengubah kolom yang muncul.
5. **Nilai lama yang tak lagi berlaku dibiarkan tersimpan**; analitik sudah
   mengabaikannya lewat `appliesTo`. Field tersembunyi tidak dikirim autosave.

## Konsekuensi

- Form dan Analisis tidak bisa lagi berbeda pendapat: mengubah `appliesTo` di
  `clinical.ts` cukup untuk mengubah kolom form.
- Test anti-drift (`measurement-fields.test.ts`) menjaga kesamaan field klinis
  dengan `INDICATORS.appliesTo`.
- Tidak ada migrasi database: semua kolom sudah nullable.

## Alternatif yang ditolak

- **Hardcode kategori di form:** itulah akar drift form vs analitik.
- **Kosongkan nilai tak berlaku:** menghapus data historis tanpa manfaat.
- **Pin `patient.category`:** tidak fleksibel saat umur/backdate berubah.
