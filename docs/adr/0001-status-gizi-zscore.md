# ADR 0001 — Status gizi balita memakai tabel SD Permenkes 2/2020 (bukan LMS)

- Status: Accepted
- Tanggal: 2026-09-10
- Konteks terkait: fitur status gizi balita + dashboard Dinkes

## Konteks

Aplikasi mencatat pengukuran balita (BB, TB/PB) dan perlu menghitung status gizi
sesuai **Permenkes No. 2 Tahun 2020**. Sebelumnya tidak ada logika Z-score sama
sekali. Rumus yang umum dipakai di lapangan (`SD = Median − (−1SD)`) hanya
akurat di pita −1…+1 SD, sehingga berisiko salah pada gizi buruk/stunting berat.

## Keputusan

1. **Metode:** menghitung Z dengan **interpolasi piecewise penuh pada 7 garis SD**
   (tabel resmi Permenkes), bukan metametode LMS matematis.
   - Alasan: sumber hukumnya adalah tabel cetak Permenkes; hasil bisa diuji
     langsung terhadap angka regulasi; tidak perlu impor parameter LMS.
2. **Umur:** bulan penuh, dihitung relatif ke **tanggal sesi** pengukuran.
3. **Koreksi pengukuran:** aturan ±0,7 cm Permenkes; default posisi menurut umur
   (<24 bln telentang, ≥24 bln berdiri), bisa diubah kader.
4. **Cakupan:** hanya 0–60 bulan; >60 bulan tidak dihitung.
5. **Penyimpanan:** hasil Z & kategori disimpan sebagai kolom aditif di
   `Measurement` (nullable), dihitung saat autosave. Ada endpoint backfill.
6. **Agregasi dashboard:** dedupe pengukuran terakhir per anak dalam periode;
   kategori "berisiko gizi lebih"/"tinggi"/"risiko BB lebih" digabung ke normal
   untuk cakupan program (sesuai catatan Permenkes).
7. **Akses:** role yang ada saja (DINKES/PUSKESMAS/POSYANDU). Tidak ada akses
   orang tua (diputuskan tidak dibuat).

## Konsekuensi

- Nilai Z persis mengikuti tabel Permenkes; mudah diaudit.
- Tabel referensi (±1.000 baris) harus dipelihara dan diberi versi
  (`GROWTH_REF_VERSION`); perubahan data menuntut backfill.
- Interpolasi linear + pembulatan 0,1 pada tabel memberi beda tipis
  dibanding LMS di antara garis SD — dapat diterima untuk kategori status gizi.
- Data lama tetap terbaca karena agregasi menghitung ulang dari BB/TB mentah.

## Alternatif yang ditolak

- **LMS (WHO 2006):** matematis mulus, tetapi angkanya berbeda tipis dari tabel
  cetak dan menambah beban data; tidak ada kebutuhan presisi sub-persentil.
- **Rumus simplifikasi ±1 SD:** ditolak karena tidak akurat pada |Z| > 1.
