# Checklist UAT & Deploy — Visualisasi Data

Dipakai setelah perubahan audit visualisasi (Wave 1–3). Tandai tiap item saat dieksekusi.
Non-blocker yang sengaja dibiarkan: F10, F20, F21, dan D (perf `recompute`) — lihat
`docs/audit-visualisasi.md` §9. **Jangan** anggap sebagai bug.

## 0. Pre-deploy (lokal)

- [ ] Semua perubahan ter-commit.
- [ ] `npm test` — 110 lulus (12 file, termasuk tes integrasi DB).
- [ ] `npm run lint` — 0 error.
- [ ] `npm run build` — exit 0.

## 1. Deploy (VPS)

```bash
cd /opt/nyawiji
git pull
npm ci
npx prisma db push        # kolom baru + REGENERATE Prisma Client (WAJIB sebelum build)
npm run db:backfill       # isi N/T & 2T untuk data lama (idempoten, bisa diulang)
npm run build             # prisma generate otomatis
pm2 restart posyandu-nyawiji
pm2 logs posyandu-nyawiji --lines 50   # pastikan tidak ada error
```

## 2. UAT — Kader (POSYANDU)

- [ ] Buka balita dengan ≥3 pengukuran → tab **Riwayat**: kurva KMS muncul; titik terakhir = BB terbaru; bentuknya masuk akal vs KMS kertas.
- [ ] Badge **N/T + selisih kg**; **2T** muncul saat 2x tidak naik berturut.
- [ ] Status **BB/U, TB/U, BB/TB** tampil (bukan hanya TB/U).
- [ ] Daftar pasien: badge **"Belum ditimbang bulan ini"** pada balita yang belum diukur bulan ini.
- [ ] Daftar pasien: chip **"2T — perlu rujuk"** pada kasus 2T.
- [ ] Input BB naik → badge berubah **N**.
- [ ] **Edit berat pengukuran lama** → status pengukuran setelahnya ikut berubah (bukti recompute rantai).
- [ ] Autosave tetap "Tersimpan Otomatis"; saat offline "Tersimpan Offline".

## 3. UAT — Puskesmas

- [ ] Tab **Analisis** → kartu **Progres Berat Badan**: cakupan bulan ini `X/Y`, jumlah tidak naik, **2T**.
- [ ] Daftar **Perlu Rujuk (2T)** terisi dan menampilkan nama/posyandu/bulan.
- [ ] Ranking partisipasi: urut **tertinggi dulu**, nomor urut, bar **0% kosong**. Angka `x / y pasien` = agregat **seluruh periode terpilih**, bukan 1 bulan.
- [ ] Ganti periode 6/12/24 → peringkat & angka `x/y` ikut berubah (bukti agregat mengikuti filter).
- [ ] Unit tanpa sasaran terdaftar tampil abu **"tanpa data"** (bukan merah 0%); unit punya sasaran tapi 0 terukur tetap **merah 0%**.
- [ ] Ganti periode 6/12/24 → jumlah titik tren sesuai (6/12/24).
- [ ] Drill ke puskesmas → ganti periode → data posyandu ikut refresh (tidak kosong/basi).

## 4. UAT — Dinkes

- [ ] Sama seperti Puskesmas, plus drill puskesmas → posyandu.
- [ ] Donut **"Distribusi Hasil Pengukuran"** punya segmen **Belum Dinilai** (abu) di samping Normal/Tidak Normal.
- [ ] Stacked bar **"Distribusi Hasil Pengukuran per Indikator"** hanya **Normal/Tidak Normal** (tanpa Belum Dinilai).
- [ ] Ranking partisipasi **Puskesmas**: peringkat = agregat periode, delta **↑/↓ poin** = momentum bulan terakhir vs sebelumnya (terpisah dari peringkat); bulan tanpa pembanding → tanpa badge.
- [ ] Kartu ringkasan menampilkan **bulan terakhir yang ada datanya**, bukan bulan berjalan 0%.
- [ ] Drill kabupaten → puskesmas → posyandu berjalan.

## 5. Verifikasi cepat teknis

- [ ] Network tab: `GET /api/stats/weight-progression` → `200` untuk tiap peran; `coverage.balitaTotal` wajar.
- [ ] Balita tanpa nilai lab (hanya BB/TB) masuk **Belum Dinilai**, **bukan Normal** (validasi inti F2).
- [ ] Partisipasi bulan lampau tidak berubah saat pasien baru ditambahkan (validasi F1).
- [ ] Ranking = Σterukur ÷ Σsasaran sepanjang periode; samakan dengan hitung manual dari tren partisipasi.

## 6. Rollback

- Kode: `git revert`/checkout commit sebelumnya → `npm run build` → `pm2 restart`.
- Schema: kolom baru aditif (nullable/default), tidak mengganggu kode lama.
- Backfill: idempoten — jalankan ulang kapan saja setelah perbaikan.

## 7. Definition of done

- [ ] Semua item §2–§5 lulus; log PM2 bersih.
- [ ] Anomali (bila ada) dicatat di `docs/audit-visualisasi.md` §9 dan hanya itu yang diperbaiki.
