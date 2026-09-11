import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi — POSYANDU NYAWIJI DIGITAL',
  description: 'Kebijakan privasi aplikasi Posyandu Nyawiji Digital.',
};

export default function PrivasiPage() {
  return (
    <LegalPage title="Kebijakan Privasi" updated="11 September 2026">
      <LegalSection title="1. Pendahuluan">
        <p>
          Aplikasi <strong>Posyandu Nyawiji Digital</strong> (&ldquo;Aplikasi&rdquo;) dikelola oleh
          Dinas Kesehatan Kabupaten Gunungkidul (&ldquo;Pengelola&rdquo;). Kebijakan ini menjelaskan
          bagaimana data pribadi dikumpulkan, digunakan, disimpan, dan dilindungi, sejalan dengan
          Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.
        </p>
      </LegalSection>

      <LegalSection title="2. Data yang Dikumpulkan">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Data pasien:</strong> nama, tanggal lahir, jenis kelamin, alamat/RT-RW, nama
            orang tua/wali, nomor HP (opsional), dan status kehamilan.
          </li>
          <li>
            <strong>Data pengukuran kesehatan:</strong> berat badan, tinggi/panjang badan, lingkar
            kepala, lingkar lengan atas (LiLA), tekanan darah, gula darah, kolesterol, asam urat,
            hemoglobin, lingkar perut, indeks massa tubuh (IMT), dan status gizi.
          </li>
          <li>
            <strong>Data akun:</strong> username, nama entitas (Posyandu/Puskesmas/Dinas Kesehatan),
            dan peran. Password disimpan dalam bentuk hash (bcrypt) dan tidak dapat dibaca Pengelola.
          </li>
        </ul>
        <p>Aplikasi tidak meminta Nomor Induk Kependudukan (NIK).</p>
      </LegalSection>

      <LegalSection title="3. Tujuan Penggunaan">
        <p>
          Data digunakan untuk pencatatan dan pemantauan kesehatan ibu dan anak di Posyandu,
          pelaporan ke Puskesmas dan Dinas Kesehatan, serta penyusunan rekap dan analisis pelayanan.
        </p>
      </LegalSection>

      <LegalSection title="4. Dasar dan Persetujuan">
        <p>
          Data anak/balita diinput atas persetujuan orang tua atau wali. Pengguna wajib memastikan
          persetujuan tersebut diperoleh sebelum memasukkan data.
        </p>
      </LegalSection>

      <LegalSection title="5. Penyimpanan Data">
        <p>
          Data disimpan pada server (VPS) Pengelola. Salinan cadangan (backup) disimpan pada
          penyimpanan lokal server dan akun penyimpanan terpisah, semata-mata untuk pemulihan data
          bila terjadi gangguan.
        </p>
      </LegalSection>

      <LegalSection title="6. Berbagi Data">
        <p>
          Data hanya dapat diakses antar jenjang sesuai peran: Posyandu &rarr; Puskesmas &rarr;
          Dinas Kesehatan. Data tidak dijual dan tidak dibagikan kepada pihak lain untuk tujuan di
          luar pelayanan kesehatan. Aplikasi tidak mengirim data ke layanan analitik atau pelacakan.
        </p>
      </LegalSection>

      <LegalSection title="7. Keamanan">
        <p>
          Pengamanan meliputi koneksi terenkripsi (HTTPS), kontrol akses berbasis peran, penyimpanan
          password dalam bentuk hash, pembatasan percobaan login, dan pencadangan berkala.
        </p>
      </LegalSection>

      <LegalSection title="8. Retensi dan Penghapusan">
        <p>
          Data disimpan selama diperlukan untuk pelayanan kesehatan dan kewajiban pelaporan. Salinan
          cadangan disimpan dengan retensi 7 hari (harian) dan 6 bulan (bulanan).
        </p>
      </LegalSection>

      <LegalSection title="9. Hak Subjek Data">
        <p>
          Subjek data (atau orang tua/wali) berhak meminta akses, koreksi, penghapusan, dan
          penarikan persetujuan. Permintaan diajukan melalui Posyandu/Puskesmas tempat pendaftaran
          atau menghubungi Pengelola.
        </p>
      </LegalSection>

      <LegalSection title="10. Cookie dan Penyimpanan Lokal">
        <p>
          Aplikasi memakai cookie sesi untuk login dan cache lokal (service worker) agar dapat
          dipakai saat koneksi terputus. Data pasien dari server tidak disimpan permanen di
          perangkat.
        </p>
      </LegalSection>

      <LegalSection title="11. Perubahan Kebijakan">
        <p>
          Perubahan kebijakan akan diumumkan pada halaman ini beserta tanggal pembaruannya.
        </p>
      </LegalSection>

      <LegalSection title="12. Kontak">
        <p>
          Pertanyaan mengenai privasi dapat disampaikan ke Pengelola melalui Dinas Kesehatan
          Kabupaten Gunungkidul (email: <em>isi-email-resmi@gunungkidulkab.go.id</em>).
        </p>
      </LegalSection>

      <p className="text-xs text-[#54656f] pt-2 border-t border-[#e9edef]">
        Lihat juga{' '}
        <Link href="/syarat" className="font-bold text-[#075e54] hover:underline">
          Syarat &amp; Ketentuan
        </Link>
        .
      </p>
    </LegalPage>
  );
}
