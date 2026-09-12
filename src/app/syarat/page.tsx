import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '@/components/LegalPage';
import { APP_NAME, APP_TAGLINE } from '@/lib/branding';

export const metadata: Metadata = {
  title: `Syarat & Ketentuan — ${APP_NAME}`,
  description: `Syarat dan ketentuan penggunaan aplikasi ${APP_TAGLINE}.`,
};

export default function SyaratPage() {
  return (
    <LegalPage title="Syarat &amp; Ketentuan" updated="11 September 2026">
      <LegalSection title="1. Penerimaan Syarat">
        <p>
          Dengan menggunakan aplikasi <strong>{APP_NAME}</strong> (&ldquo;Aplikasi&rdquo;),
          Anda menyatakan telah membaca dan menyetujui Syarat &amp; Ketentuan ini.
        </p>
      </LegalSection>

      <LegalSection title="2. Definisi">
        <p>
          &ldquo;Pengelola&rdquo; adalah Dinas Kesehatan Kabupaten Gunungkidul. &ldquo;Pengguna&rdquo;
          adalah kader Posyandu, petugas Puskesmas, atau pegawai Dinas Kesehatan yang diberi akses.
        </p>
      </LegalSection>

      <LegalSection title="3. Akun dan Kewajiban Pengguna">
        <ul className="list-disc pl-5 space-y-1">
          <li>Akun dibuat oleh jenjang di atasnya (Posyandu oleh Puskesmas, Puskesmas oleh Dinas Kesehatan).</li>
          <li>Akun baru memakai password default dan <strong>wajib diganti saat login pertama</strong>.</li>
          <li>Pengguna wajib menjaga kerahasiaan password dan tidak membagikan akses ke pihak lain.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Hak Akses">
        <p>
          Kader Posyandu dapat menambah, mengubah, dan menghapus data pasien di wilayahnya. Puskesmas
          dan Dinas Kesehatan memiliki akses tinjauan (read-only) untuk pemantauan.
        </p>
      </LegalSection>

      <LegalSection title="5. Penggunaan yang Dilarang">
        <ul className="list-disc pl-5 space-y-1">
          <li>Memasukkan data tanpa persetujuan orang tua/wali atau subjek data.</li>
          <li>Mengakses atau memakai data di luar kewenangan dan tugas pelayanan.</li>
          <li>Mengganggu, merusak, atau mencoba mengakses sistem tanpa izin.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Kepemilikan Data">
        <p>
          Data pelayanan kesehatan milik Pengelola dan instansi terkait, digunakan sesuai ketentuan
          pelayanan kesehatan dan pelindungan data pribadi.
        </p>
      </LegalSection>

      <LegalSection title="7. Ketersediaan Layanan">
        <p>
          Aplikasi disediakan &ldquo;sebagaimana adanya&rdquo;. Pengelola tidak menjamin layanan
          selalu bebas gangguan, namun mengupayakan ketersediaan dan pemulihan data.
        </p>
      </LegalSection>

      <LegalSection title="8. Batasan Tanggung Jawab">
        <p>
          Pengelola tidak bertanggung jawab atas kerugian akibat penggunaan yang melanggar ketentuan,
          kelalaian menjaga password, atau gangguan di luar kendali Pengelola.
        </p>
      </LegalSection>

      <LegalSection title="9. Penangguhan dan Penghapusan Akun">
        <p>
          Pengelola dapat menangguhkan atau menghapus akun yang melanggar ketentuan atau tidak lagi
          berwenang.
        </p>
      </LegalSection>

      <LegalSection title="10. Perubahan Syarat">
        <p>Perubahan Syarat &amp; Ketentuan akan diumumkan pada halaman ini.</p>
      </LegalSection>

      <LegalSection title="11. Hukum yang Berlaku">
        <p>Syarat ini tunduk pada hukum yang berlaku di Republik Indonesia.</p>
      </LegalSection>

      <LegalSection title="12. Kontak">
        <p>
          Pertanyaan mengenai ketentuan ini dapat disampaikan ke Dinas Kesehatan Kabupaten
          Gunungkidul (email:{' '}
          <a href="mailto:kesehatan@gunungkidulkab.go.id" className="font-bold text-[#075e54] hover:underline">
            kesehatan@gunungkidulkab.go.id
          </a>
          ).
        </p>
      </LegalSection>

      <p className="text-xs text-[#54656f] pt-2 border-t border-[#e9edef]">
        Lihat juga{' '}
        <Link href="/privasi" className="font-bold text-[#075e54] hover:underline">
          Kebijakan Privasi
        </Link>
        .
      </p>
    </LegalPage>
  );
}
