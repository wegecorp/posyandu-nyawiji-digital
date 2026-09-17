import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { LegalPage } from '@/components/LegalPage';
import { APP_NAME, APP_TAGLINE } from '@/lib/branding';

export const metadata: Metadata = {
  title: `Panduan Pengguna — ${APP_NAME}`,
  description: `Panduan pemakaian aplikasi ${APP_TAGLINE}.`,
};

function GuideSection({
  title,
  children,
  open = false,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details
      open={open}
      className="group border border-[#e9edef] rounded-2xl bg-white overflow-hidden"
    >
      <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none font-extrabold text-[#075e54] text-sm hover:bg-[#f0f2f5] transition-colors">
        <span>{title}</span>
        <ChevronDown className="w-4 h-4 shrink-0 text-[#128c7e] transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 py-3 space-y-2 text-sm text-[#111b21] border-t border-[#e9edef]">
        {children}
      </div>
    </details>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal pl-5 space-y-1">{children}</ol>;
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="p-2.5 bg-[#f0f2f5] border border-[#e9edef] rounded-xl text-xs text-[#54656f]">
      {children}
    </p>
  );
}

function Danger({ children }: { children: ReactNode }) {
  return (
    <p className="p-2.5 bg-[#fef2f2] border border-[#fecaca] rounded-xl text-xs text-[#ef4444] font-medium">
      {children}
    </p>
  );
}

export default function PanduanPage() {
  return (
    <LegalPage title="Panduan Pengguna" updated="17 September 2026">
      <p>
        Panduan singkat memakai <strong>{APP_NAME}</strong>: dari aktivasi akun, ubah password,
        input pengukuran, sampai mengoreksi atau menghapus data pasien. Klik judul bab untuk
        membuka.
      </p>
      <Note>
        Bab umum berlaku untuk semua jenjang. Bab khusus <strong>Puskesmas</strong> dan{' '}
        <strong>Dinas Kesehatan</strong> ada di bagian bawah.
      </Note>

      <GuideSection title="1. Aktivasi Akun Pertama Kali" open>
        <p>
          Akun baru memakai <strong>password default</strong> dari jenjang di atasnya. Saat login
          pertama, aplikasi otomatis menampilkan layar <strong>Aktivasi Akun</strong>.
        </p>
        <Steps>
          <li>Masukkan <strong>Password Baru</strong>.</li>
          <li>Ketik ulang di kolom <strong>Konfirmasi Password Baru</strong>.</li>
          <li>Klik <strong>Aktifkan &amp; Masuk</strong>.</li>
        </Steps>
        <Note>
          Ketentuan password: minimal <strong>8 karakter</strong> dan tidak boleh sama dengan
          password default. Ingat dan jaga kerahasiaannya.
        </Note>
      </GuideSection>

      <GuideSection title="2. Mengganti Password Sendiri">
        <Steps>
          <li>Ketuk nama akun di <strong>pojok kiri atas</strong> bar aplikasi.</li>
          <li>Pada <strong>Detail Akun Sesi</strong>, pilih <strong>Ubah Password Saya</strong>.</li>
          <li>Isi <strong>Password Saat Ini</strong>, <strong>Password Baru</strong> (min. 8
            karakter), dan <strong>Konfirmasi Password Baru</strong>.</li>
          <li>Klik <strong>Simpan Password Baru</strong>.</li>
        </Steps>
        <Note>Setelah ganti password, sesi di perangkat ini tetap aktif — tidak perlu login ulang.</Note>
      </GuideSection>

      <GuideSection title="3. Install / Simpan Aplikasi di HP">
        <ul className="list-disc pl-5 space-y-1">
          <li>Di <strong>halaman login</strong>: tombol hijau <strong>INSTALL APLIKASI</strong>.</li>
          <li>Setelah masuk: tombol <strong>Install Aplikasi</strong> di bar paling atas.</li>
          <li>Tombol hilang otomatis bila aplikasi sudah terpasang.</li>
        </ul>
        <p>
          <strong>Android (Chrome/Edge/Samsung Internet):</strong> muncul dialog &ldquo;Instal
          aplikasi&rdquo; → ketuk <strong>Instal</strong>.
        </p>
        <p>
          <strong>iPhone/iPad (Safari):</strong> ketuk tombol <strong>Bagikan</strong> (kotak dengan
          panah ke atas) → <strong>Tambahkan ke Layar Utama</strong> → <strong>Tambah</strong>.
        </p>
        <Note>
          Pemasangan butuh internet sekali saja. Gunakan browser versi terbaru.
        </Note>
      </GuideSection>

      <GuideSection title="4. Menambah &amp; Mencari Pasien">
        <Steps>
          <li>Klik tombol hijau <strong>PASIEN BARU</strong>.</li>
          <li>Isi minimal <strong>Nama Lengkap</strong> dan <strong>Tanggal Lahir</strong> (tanpa NIK).</li>
          <li>Pilih <strong>Jenis Kelamin</strong>; centang <strong>Pasien Ibu Hamil (Bumil)</strong>{' '}
            bila perlu.</li>
          <li>Data tambahan (wali/alamat/HP) lewat <strong>Isi (opsional)</strong> bila ada.</li>
          <li>Klik <strong>Daftar &amp; Langsung Ukur</strong>.</li>
        </Steps>
        <p>
          Pasien lama cukup dicari di <strong>kotak pencarian</strong>, atau dipindai lewat ikon{' '}
          <strong>QR</strong> di bar atas / di samping kotak cari.
        </p>
        <Note>
          Bila ada pasien mirip, aplikasi menanyakan konfirmasi agar tidak terjadi data ganda.
          Salah input? Gunakan <strong>Edit</strong>, jangan daftar ulang.
        </Note>
      </GuideSection>

      <GuideSection title="5. Mengisi Pengukuran">
        <Steps>
          <li>Pilih pasien dari daftar.</li>
          <li>Pada tab <strong>Input Hari Ini</strong>, isi kolom yang muncul otomatis sesuai usia.</li>
          <li>
            <strong>BB dan TB wajib</strong> agar pasien dianggap selesai diukur. IMT dihitung
            otomatis.
          </li>
          <li>
            Nilai <strong>tersimpan otomatis</strong> — tunggu tanda <strong>Tersimpan Otomatis</strong>.
          </li>
          <li>Klik <strong>Selesai — Kembali ke Daftar</strong> untuk lanjut pasien berikutnya.</li>
        </Steps>
        <p>
          Badge pada kartu pasien: <strong>Sudah diukur</strong>, <strong>Diukur sebagian</strong>,{' '}
          <strong>Belum diukur hari ini</strong>, <strong>Belum ditimbang bulan ini</strong>, dan{' '}
          <strong>2T — perlu rujuk</strong> (dua kali berturut-turut berat badan tidak naik).
        </p>
      </GuideSection>

      <GuideSection title="6. Edit / Koreksi Data Pasien">
        <Steps>
          <li>Pada kartu pasien, ketuk ikon <strong>pensil</strong>.</li>
          <li>Perbaiki nama, tanggal lahir, jenis kelamin, status Bumil, wali, alamat, atau nomor HP.</li>
          <li>Klik <strong>Simpan Perubahan</strong>.</li>
        </Steps>
        <Note>
          Perubahan <strong>tanggal lahir</strong> memengaruhi perhitungan usia, kelompok sasaran,
          dan status gizi.
        </Note>
      </GuideSection>

      <GuideSection title="7. Menghapus Pasien">
        <p>
          Hanya <strong>Kader Posyandu</strong> yang dapat menghapus. Puskesmas dan Dinas Kesehatan
          bersifat hanya-lihat.
        </p>
        <Steps>
          <li>Ketuk ikon <strong>pensil</strong> pada kartu pasien.</li>
          <li>Di bagian bawah, klik <strong>Hapus Pasien</strong> (Zona Bahaya).</li>
          <li>Pada konfirmasi, klik <strong>Ya, Hapus Pasien</strong>.</li>
        </Steps>
        <Danger>
          Penghapusan bersifat permanen: seluruh riwayat pengukuran pasien ikut terhapus dan{' '}
          <strong>tidak dapat dibatalkan</strong>. Untuk koreksi biasa, gunakan Edit — bukan hapus.
        </Danger>
      </GuideSection>

      <GuideSection title="8. Menghapus Satu Sesi Pengukuran">
        <p>Dipakai bila satu bulan pengukuran salah input dan perlu dibuang.</p>
        <Steps>
          <li>Buka pasien, pilih tab <strong>Riwayat</strong>.</li>
          <li>Pada baris bulan yang salah, klik <strong>Hapus</strong>.</li>
          <li>Klik <strong>Ya</strong> untuk konfirmasi.</li>
        </Steps>
        <Note>
          Setelah dihapus, perhitungan N/T dan tanda 2T pasien dihitung ulang dari awal.
        </Note>
      </GuideSection>

      <GuideSection title="9. Export Data (Excel)">
        <Steps>
          <li>Buka <strong>Export Data</strong> (ikon berkas di bar atas, atau tombol Rekap di beranda).</li>
          <li>
            Centang <strong>Isi</strong>: Ringkasan, Daftar Anggota, Detail Pengukuran, Daftar
            Berisiko.
          </li>
          <li>Pilih <strong>Cakupan</strong> (khusus Puskesmas: semua binaan atau pilih posyandu).</li>
          <li>Pilih <strong>Periode</strong>, periksa <strong>Preview</strong>.</li>
          <li>Klik <strong>Unduh Excel</strong>.</li>
        </Steps>
        <Note>
          Kader hanya mengunduh data posyandunya sendiri. Dinas Kesehatan hanya menerima ringkasan
          agregat tanpa nama pasien.
        </Note>
      </GuideSection>

      <GuideSection title="10. Keluar Akun (Logout) / Ganti Akun">
        <Steps>
          <li>Ketuk nama akun di <strong>pojok kiri atas</strong>.</li>
          <li>Pada <strong>Detail Akun Sesi</strong>, klik <strong>Keluar Akun (Logout)</strong>.</li>
          <li>Untuk ganti akun, lanjutkan login memakai akun yang lain.</li>
        </Steps>
        <Danger>
          Jangan logout bila masih ada data <strong>menunggu sinkron ke server</strong> — data yang
          belum terkirim bisa hilang. Pastikan perangkat sudah online.
        </Danger>
      </GuideSection>

      <GuideSection title="11. Khusus Puskesmas">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Daftarkan Posyandu</strong>: isi nama, pilih kalurahan dan padukuhan.
          </li>
          <li>
            <strong>Reset password</strong> (ikon kunci): kembali ke password default; kader wajib
            aktivasi ulang.
          </li>
          <li>
            <strong>Nonaktifkan / Aktifkan</strong> (ikon daya): cabut akses tanpa menghapus data.
          </li>
          <li>
            <strong>Hapus posyandu</strong> (ikon tempat sampah): hanya bila belum punya pasien &
            pengukuran.
          </li>
          <li>
            <strong>Buka Meja</strong>: lihat data posyandu binaan dalam mode hanya-lihat.
          </li>
        </ul>
      </GuideSection>

      <GuideSection title="12. Khusus Dinas Kesehatan">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Daftarkan Puskesmas</strong>: isi nama dan pilih kapanewon; sistem membuat
            username staf otomatis.
          </li>
          <li>
            <strong>Import Posyandu massal</strong> dari Excel/CSV (kolom NAMA PUSKESMAS, NAMA
            KALURAHAN, NAMA PADUKUHAN, NAMA POSYANDU). Gunakan <strong>Analisis Dulu</strong>{' '}
            sebelum import.
          </li>
          <li>
            <strong>Buka / Reset Pass</strong> untuk posyandu di bawah setiap puskesmas.
          </li>
        </ul>
        <Note>Dinkes hanya melihat agregat per wilayah, bukan nama per pasien.</Note>
      </GuideSection>

      <GuideSection title="13. Bantuan &amp; Tips">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Lupa password?</strong> Hubungi jenjang di atas Anda (Posyandu → Puskesmas,
            Puskesmas → Dinkes) untuk direset.
          </li>
          <li>
            <strong>Tanpa sinyal:</strong> data disimpan sementara di perangkat. Jangan logout;
            saat online data tersinkron otomatis.
          </li>
          <li>
            <strong>Gunakan satu HP utama</strong> per posyandu agar tidak muncul peringatan
            &ldquo;Data Bentrok&rdquo;.
          </li>
          <li>
            <strong>Simpan kartu QR warga</strong> agar hari buka cukup dipindai, tidak mengetik nama.
          </li>
        </ul>
      </GuideSection>
    </LegalPage>
  );
}
