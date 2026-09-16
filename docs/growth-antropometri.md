# Status Gizi Balita — Rumus & Aturan (Permenkes No. 2 Tahun 2020)

Dokumen ini adalah rujukan lengkap untuk fitur status gizi balita 0–60 bulan:
rumus yang dipakai, cara perhitungan, koreksi pengukuran, kategori, dan
pemetaannya ke kode. **Semua angka dan aturan di sini bersumber dari
Permenkes No. 2 Tahun 2020 tentang Standar Antropometri Anak, Lampiran Bab II.**

> Sumber hukum: Peraturan Menteri Kesehatan Republik Indonesia Nomor 2 Tahun
> 2020. Standar yang diadopsi: *WHO Child Growth Standards* untuk 0–5 tahun dan
> *WHO Reference 2007* untuk 5–18 tahun (yang terakhir belum dipakai di aplikasi ini).

---

## 1. Empat indeks yang dihitung

| Indeks | Nama | Rentang | Tabel referensi |
|---|---|---|---|
| `BB_U` | Berat Badan menurut Umur | 0–60 bulan | BB/U |
| `TB_U` | Panjang/Tinggi Badan menurut Umur | 0–60 bulan | PB/U (0–24 bln), TB/U (24–60 bln) |
| `BB_TB` | Berat Badan menurut Panjang/Tinggi Badan | 0–60 bulan | BB/PB (panjang), BB/TB (tinggi) |
| `IMT_U` | Indeks Massa Tubuh menurut Umur | 0–60 bulan | IMT/U |

Anak **>60 bulan** tidak dihitung status gizinya (data tetap tersimpan).

> **Kaitannya dengan kategori siklus hidup (ADR-0002):** status gizi hanya berlaku untuk
> `BAYI` (0–5 bln) dan `BALITA_APRAS` (6–83 bln). Karena tabel Permenkes berhenti di 60 bulan,
> `BALITA_APRAS` usia **61–83 bulan** (5 th 1 bln–6 th 11 bln) tetap mencatat BB/TB tetapi
> **status gizi kosong** ("di luar rentang tabel 0–60"). Upgrade = tabel **WHO Reference 2007**
> (5–18 th) — belum dikerjakan.

---

## 2. Rumus utama Z-score

$$
Z = \frac{\text{Nilai Ukur} - \text{Nilai Median}}{\text{Nilai Simpang Baku (SD)}}
$$

Karena Permenkes menerbitkan **tabel nilai SD** (bukan parameter LMS), nilai
simpang baku bersifat *piecewise* — dihitung menurut segmen tempat Nilai Ukur
berada. Tabel referensi berisi 7 garis: **−3, −2, −1, Median, +1, +2, +3 SD**.

Implementasi: interpolasi linear pada garis-garis tersebut
(`zFromReference` di `src/lib/growth/tables.ts`).

### 2.1 Cara kerja piecewise (7 titik)

Untuk nilai $X$ dengan nilai rujukan $V_{-3} \le V_{-2} \le \dots \le V_{+3}$:

- Jika $X$ berada di antara dua garis berurutan $V_i \le X \le V_{i+1}$:
  $$Z = z_i + \frac{X - V_i}{V_{i+1} - V_i}$$
  dengan $z_i$ = nilai Z garis ke-i (−3…+3).
- Jika $X$ di bawah $V_{-3}$ atau di atas $V_{+3}$, gunakan kemiringan segmen
  terdekat (ekstrapolasi), lalu dijepit ke rentang [−5, +5].

> **Catatan penting:** rumus populer `SD = Median − (−1SD)` hanya tepat di pita
> −1…+1 SD. Untuk deteksi gizi buruk/stunting berat (|Z| > 2), kesalahan bisa
> signifikan. Karena itu implementasi memakai piecewise penuh.

### 2.2 Contoh perhitungan

Balita **laki-laki, 12 bulan, BB = 8,0 kg**. Tabel BB/U Laki-laki umur 12 bulan
(Lampiran Permenkes):

| −3 SD | −2 SD | −1 SD | Median | +1 SD | +2 SD | +3 SD |
|---|---|---|---|---|---|---|
| 6,9 | 7,7 | 8,6 | 9,6 | 10,8 | 12,0 | 13,3 |

8,0 kg berada di antara −2 SD (7,7) dan −1 SD (8,6):

$$Z = -2 + \frac{8{,}0 - 7{,}7}{8{,}6 - 7{,}7} = -2 + \frac{0{,}3}{0{,}9} = -1{,}67$$

Kategori: **−1,67** ada di rentang −2…+1 SD → **Berat Badan Normal**.

> Dengan rumus simplifikasi (`Median − (−1SD)` = 1,0) hasilnya −1,6. Keduanya
> masih "Normal", tetapi angkanya berbeda — inilah alasan piecewise dipilih.

---

## 3. Umur & koreksi panjang/tinggi badan

### 3.1 Umur = bulan penuh
Permenkes: umur dihitung dalam **bulan penuh** ("2 bulan 29 hari = 2 bulan").
Di kode: `ageInCompletedMonths(birthDate, sessionDate)` — dihitung relatif ke
**tanggal sesi pengukuran**, bukan hari ini, agar entri yang diinput terlambat
tetap benar.

### 3.2 Posisi ukur & koreksi ±0,7 cm
- Indeks **PB** dipakai untuk 0–24 bln yang diukur **telentang**.
- Indeks **TB** dipakai untuk ≥24 bln yang diukur **berdiri**.
- Bila **<24 bln diukur berdiri** → tambah **+0,7 cm**.
- Bila **≥24 bln diukur telentang** → kurangi **−0,7 cm**.

Posisi default: `<24 bln` = `TELENTANG`, `≥24 bln` = `BERDIRI`; kader boleh
mengubah. Fungsi: `correctedLengthHeight()`.

### 3.3 Pemilihan tabel
- `BB_U` → tabel BB/U (umur).
- `TB_U` → PB/U bila <24 bln, TB/U bila ≥24 bln.
- `BB_TB` → BB/PB (kunci panjang, <24 bln) atau BB/TB (kunci tinggi, ≥24 bln);
  kunci tabel adalah sentimeter (bisa pecahan 0,5 → diinterpolasi).
- `IMT_U` → $BB / (TB/100)^2$, lalu tabel IMT/U sesuai kelompok umur.

---

## 4. Kategori & ambang batas (0–60 bulan)

### 4.1 BB/U
| Kategori | Ambang | Warna |
|---|---|---|
| Berat Badan Sangat Kurang | < −3 SD | `#ef4444` merah |
| Berat Badan Kurang | −3 s.d. < −2 SD | `#f59e0b` kuning tua |
| Berat Badan Normal | −2 s.d. +1 SD | `#22c55e` hijau |
| Risiko Berat Badan Lebih | > +1 SD | `#eab308` kuning |

### 4.2 PB/U – TB/U
| Kategori | Ambang | Warna |
|---|---|---|
| Sangat Pendek | < −3 SD | `#ef4444` merah |
| Pendek | −3 s.d. < −2 SD | `#f59e0b` kuning tua |
| Normal | −2 s.d. +3 SD | `#22c55e` hijau |
| Tinggi | > +3 SD | `#3b82f6` biru |

### 4.3 BB/PB – BB/TB dan IMT/U
| Kategori | Ambang | Warna |
|---|---|---|
| Gizi Buruk (severely wasted) | < −3 SD | `#ef4444` merah |
| Gizi Kurang (wasted) | −3 s.d. < −2 SD | `#f59e0b` kuning tua |
| Gizi Baik (normal) | −2 s.d. +1 SD | `#22c55e` hijau |
| Berisiko Gizi Lebih | > +1 s.d. +2 SD | `#eab308` kuning |
| Gizi Lebih (overweight) | > +2 s.d. +3 SD | `#f97316` oranye |
| Obesitas | > +3 SD | `#dc2626` merah tua |

> **Warna & KMS:** KMS resmi hanya mewarnai grafik BB/U (hijau = normal,
> kuning = kurang, merah = buruk). Palet di atas memperluas semantik itu ke
> semua indeks. Definisi tunggal ada di `src/lib/growth/categories.ts`.

### 4.4 Aturan cakupan program (survei)
Permenkes mencatat kategori **"berisiko gizi lebih"** (dan analognya "tinggi",
"risiko berat badan lebih") dipakai untuk **penilaian individu**, **bukan** untuk
hasil survei/cakupan. Maka pada agregasi dashboard, kategori tersebut
**digabung ke normal** (`surveyCategoryKey()`). Halaman/perhitungan individu
tetap menampilkan semua kategori.

---

## 5. Data referensi

- Lokasi: `src/lib/growth/data/*.json`.
- Format: tiap file `{ index, keyType, zLines, male, female }`; tiap baris
  `[key, [v-3, v-2, v-1, v0, v+1, v+2, v+3]]`.
- `keyType`: `ageMonths` (bilangan bulat 0–60) atau `lengthCm`/`heightCm`
  (sentimeter, langkah 0,5).
- Sumber: diekstrak dari Lampiran Permenkes 2/2020 (tabel 1–14). Satu sel rusak
  di sumber (`69.5 6.` pada BB/TB perempuan) dikoreksi menjadi `6.3`.
- Versi: `GROWTH_REF_VERSION = 'permenkes-2-2020-v1'` di `tables.ts`.

### Cara memperbarui tabel
1. Perbarui file JSON.
2. Naikkan `GROWTH_REF_VERSION`.
3. Jalankan `npm test` (vektor uji di `growth.test.ts`).
4. Hitung ulang data lama: `POST /api/dinkes/backfill-growth` (akun DINKES).

---

## 6. Peta implementasi

| Fungsi | Letak |
|---|---|
| Engine (umur, koreksi, Z, kategori) | `src/lib/growth/index.ts` |
| Tabel & interpolasi Z | `src/lib/growth/tables.ts` |
| Kategori, ambang, warna | `src/lib/growth/categories.ts` |
| Agregasi dashboard | `src/lib/growth-analytics.ts` |
| API dashboard | `src/app/api/stats/growth/route.ts` |
| Hitung saat simpan | `src/app/api/measurements/autosave/route.ts` |
| UI dashboard | `src/components/analisis/GrowthStatusDistribution.tsx` |
| UI form + badge live | `src/components/DynamicMeasurementForm.tsx` |
| Drill detail status gizi | `src/app/api/stats/growth-patients/route.ts` |
| Rekap ringkas (Excel) | `src/app/api/stats/report/route.ts` |
| Backfill | `src/app/api/dinkes/backfill-growth/route.ts` |

### Kolom tersimpan di `Measurement`
`position`, `ageInDays`, `zWeightAge`, `zHeightAge`, `zWeightHeight`,
`zBmiAge`, `underweightStatus`, `stuntingStatus`, `wastingStatus`,
`growthRefVersion`.

---

## 7. Vektor uji (regresi)

| Kasus | Harapan |
|---|---|
| L, 12 bln, BB 8,0 kg | Z BB/U = **−1,67**, kategori normal |
| L, 12 bln, BB 8,0 / TB 75,7 | IMT/U = kategori **wasted** |
| <24 bln, diukur berdiri 75,0 | terkoreksi **75,7** |
| ≥24 bln, diukur telentang 90,0 | terkoreksi **89,3** |
| gender kosong | `ok:false`, reason `gender` |
| umur >60 bln | `ok:false`, reason `age` |

Jalankan: `npm test`.

---

## 8. Daftar verifikasi tersisa

- [ ] Pastikan nilai tabel JSON cocok 1:1 dengan cetakan Permenkes 2/2020
      (khususnya sel 69,5 cm BB/TB perempuan yang dikoreksi manual).
- [ ] Konfirmasi ke petugas gizi: apakah kategori "berisiko gizi lebih" harus
      tetap disembunyikan pada cakupan program seperti catatan Permenkes.
- [ ] Bila nanti mendukung 5–18 tahun, tambahkan tabel *WHO Reference 2007*
      (IMT/U 5–18 punya batas atas berbeda: obesitas > +2 SD).
