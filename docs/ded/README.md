# Dokumentasi Teknis (DED) — Portal Nyawiji

Kumpulan dokumen desain teknis untuk **developer Dinas Kesehatan Kabupaten
Gunungkidul** yang akan meneruskan atau mengoperasikan Portal Nyawiji.

Semua diagram memakai **Mermaid** — ter-render otomatis di GitHub, VS Code, dan GitLab.
Tidak butuh alat tambahan.

> **Status (per 17 September 2026).** Dokumen di folder ini menggambarkan **desain
> target**: database PostgreSQL. Kondisi nyata: `main` masih SQLite, seluruh perubahan
> PostgreSQL ada di branch `feat/migrasi-postgresql` (belum di-merge), dan cutover
> belum dijalankan. Alur proses, model data, dan API di dokumen ini **tidak berubah**
> karena migrasi; hanya penyimpanan yang berpindah. Rincian: `DED.md` blok
> "Status implementasi" dan `RUNBOOK-MIGRASI-POSTGRESQL.md`.

## Daftar dokumen

| Dokumen | Isi | Untuk pertanyaan |
|---|---|---|
| [`FLOWCHART.md`](FLOWCHART.md) | Alur proses bisnis (7 proses) + alur sistem teknis (login, offline-sync, export, reset password, import wilayah, backfill) | "bagaimana alurnya?" |
| [`DFD.md`](DFD.md) | Data Flow Diagram: konteks, level 1, level 2, kamus aliran data | "data mengalir dari mana ke mana?" |
| [`ERD.md`](ERD.md) | Model relasi 7 tabel, kunci, indeks, aturan cascade, kolom turunan | "bagaimana struktur datanya?" |
| [`DED.md`](DED.md) | Dokumen utama: stack, aktor, kebutuhan fungsional & non-fungsional, arsitektur, 32 API, keamanan, operasional, batasan & rekomendasi | "semuanya, mulai dari sini" |
| [`RUNBOOK-MIGRASI-POSTGRESQL.md`](RUNBOOK-MIGRASI-POSTGRESQL.md) | Prosedur migrasi SQLite → PostgreSQL, verifikasi paritas, cutover, rollback | "bagaimana pindah database?" |

## Urutan baca yang disarankan

1. **`DED.md` §1–§3** — pahami sistem, stack, dan aktor.
2. **`ERD.md`** — struktur database.
3. **`FLOWCHART.md` §2–§4** — alur kerja nyata.
4. **`DFD.md`** — aliran data antar proses & data store.
5. **`DED.md` §8–§15** — infrastruktur, API, keamanan, operasional, batasan.

## Konvensi dokumen

- **Bahasa**: Indonesia; istilah teknis/identifier kode tetap bahasa aslinya.
- **Sumber kebenaran**: kode di repo ini. Bila dokumen berbeda dengan kode, **kode
  yang benar** — dan dokumen wajib diperbarui.
- **Temuan ketidaksesuaian** dicatat eksplisit di `DED.md §15` (contoh: dokumen
  analisis lama menyebut IndexedDB, sedangkan kode memakai `localStorage`).
- Setiap kotak pada diagram alur sistem dapat ditelusuri ke berkas kode; daftarnya
  ada di `FLOWCHART.md` bagian *Referensi kode*.

## Dokumen terkait di luar folder ini

| Berkas | Isi |
|---|---|
| `CONTEXT.md` | glosarium domain + aturan kunci |
| `docs/adr/` | keputusan arsitektur (ADR-0001 s.d. 0004) |
| `docs/growth-antropometri.md` | standar Z-score Permenkes 2/2020 |
| `docs/DEPLOY-BARU.md` | pemasangan server dari nol |
| `DEPLOY-UPDATE.md` | rilis rutin + jendela pemeliharaan |
| `DEPLOY-VPS.md` | deploy VPS + backup/restore |
| `docs/uat-deploy-checklist.md` | checklist UAT per peran |
| `PANDUAN-PENGGUNA.md` | panduan untuk kader/staf |
| `PROJECT_POSYANDU/` | analisis proses bisnis (sumber naratif) |
