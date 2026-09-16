# ADR 0003 — Skrining TB bulanan (Beresiko / Tidak Beresiko)

- Status: Accepted
- Tanggal: 2026-09-16
- Konteks terkait: form pengukuran, indikator klinis, export

## Konteks

Posyandu perlu mencatat risiko tuberkulosis tiap kunjungan. Masukan lapangan meminta
sesederhana mungkin: satu pertanyaan, dua pilihan, **tiap bulan**, tanpa daftar gejala.

## Keputusan

1. **Satu field** `Measurement.tbScreeningStatus String?` dengan nilai
   `BERESIKO` / `TIDAK_BERESIKO` (`null` = belum/tidak berlaku).
2. **Bulanan**: ditanyakan pada tiap sesi (bulan) seperti field skrining lain. Bisa
   dikosongkan (tombol pil aktif = batal).
3. **Sasaran**: semua kategori siklus hidup. Diatur satu titik lewat
   `INDICATORS[].appliesTo` (`src/lib/clinical.ts`) — persempit cukup dengan mengubah array itu.
4. **Indikator**: ditambahkan ke `INDICATORS` sebagai `tbRisk` sehingga otomatis masuk:
   donut normal/abnormal, bar temuan, daftar pasien abnormal, rekap, dan export.
5. **Bukan diagnosis.** Ini penanda risiko/rujukan, bukan hasil pemeriksaan TB.

## Konsekuensi

- Field baru di `Measurement` (aditif, nullable) → `prisma db push` saat deploy.
- Satu jawaban TB membuat baris "dinilai" pada outcome (mengubah rasio normal/abnormal).
- Muncul di export sebagai kolom `Skrining TB` (Detail + Roster) dan baris `Beresiko
  Tuberkulosis (TB)` di sheet **Daftar Berisiko**.
- Perlu `COMPLETION_FIELDS` (bila kelengkapan per kategori difinalkan) mempertimbangkan TB.

## Alternatif yang ditolak

- **Kuesioner gejala (batuk ≥2 minggu, demam, kontak TB, dll):** lebih kaya, tetapi
  ditolak untuk sekarang karena diminta sederhana; bisa ditambahkan kemudian sebagai field
  terpisah tanpa membatalkan keputusan ini.
- **Frekuensi sekali saja:** ditolak; risiko TB perlu dipantau berkala.
