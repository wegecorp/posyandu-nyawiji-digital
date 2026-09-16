# Architecture Decision Records (ADR)

Keputusan arsitektur & domain yang mengikat. Dibaca sebelum mengubah area terkait.
Bahasa: Indonesia. Format ringkas: Konteks → Keputusan → Konsekuensi → Alternatif ditolak.

| # | Judul | Status | Area |
|---|---|---|---|
| [0001](./0001-status-gizi-zscore.md) | Status gizi balita memakai tabel SD Permenkes 2/2020 (bukan LMS) | Accepted | growth |
| [0002](./0002-kategori-siklus-hidup-dan-asi.md) | Kategori siklus hidup Posyandu & field ASI Eksklusif | Accepted | kategori, form |
| [0003](./0003-skrining-tb.md) | Skrining TB bulanan (Beresiko / Tidak Beresiko) | Accepted | form, indikator |
| [0004](./0004-cakupan-nt-2t-0-60-bulan.md) | Cakupan N/T & 2T terbatas umur 0–60 bulan (Permenkes 2/2020 + KMS) | Accepted | growth, analisis, export |

## Konvensi

- ADR ditulis saat keputusan mengubah perilaku lintas-modul atau sulit dibalik.
- Bila usulan baru bertentangan dengan ADR, **tandai eksplisit** di usulan, jangan diam-diam menimpa.
- Dokumen domain/glosarium ada di `CONTEXT.md` di root.
