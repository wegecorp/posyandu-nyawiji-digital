'use client';

import React from 'react';
import { Download, X, Smartphone, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { detectPlatform, type InstallGuide } from '@/lib/pwa';

interface InstallAppModalProps {
  guide: InstallGuide | null;
  onClose: () => void;
}

const stepCard = (num: string, text: React.ReactNode) => (
  <li className="flex items-start gap-3">
    <span className="w-6 h-6 shrink-0 bg-[#075e54] text-white rounded-full flex items-center justify-center text-[11px] font-black">
      {num}
    </span>
    <div className="text-xs text-[#111b21] font-medium leading-relaxed flex-1 pt-0.5">{text}</div>
  </li>
);

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ guide, onClose }) => {
  const platform = detectPlatform();
  const browserName: Record<string, string> = {
    chrome: 'Google Chrome',
    'chrome-ios': 'Google Chrome',
    edge: 'Microsoft Edge',
    samsung: 'Samsung Internet',
    firefox: 'Mozilla Firefox',
    safari: 'Safari',
    opera: 'Opera',
    unknown: 'browser ini',
  };
  const browserLabel = browserName[platform.browser] || 'browser ini';

  if (!guide) return null;

  const headline =
    guide === 'ios'
      ? 'Simpan ke Layar Utama (iPhone/iPad)'
      : guide === 'android'
        ? 'Pasang Manual — HP Android'
        : guide === 'desktop'
          ? 'Pasang dari Browser (Komputer)'
          : 'Browser Belum Mendukung Tombol Instal';

  const body =
    guide === 'ios' ? (
      <ul className="space-y-3">
        {stepCard('1', <>Buka <strong>POSYANDU NYAWIJI</strong> memakai <strong>Safari</strong> (browser bawaan iPhone/iPad).</>)}
        {stepCard('2', <>Ketuk tombol <strong>Bagikan</strong> <span className="inline-flex align-middle mx-1">&#8679;</span> di bar bawah Safari.</>)}
        {stepCard('3', <>Gulir lalu pilih <strong>&ldquo;Tambahkan ke Layar Utama&rdquo; (Add to Home Screen)</strong>.</>)}
        {stepCard('4', <>Ketuk <strong>Tambah</strong> di kanan atas. Ikon aplikasi akan muncul di layar utama HP Anda.</>)}
      </ul>
    ) : guide === 'android' ? (
      <ul className="space-y-3">
        {stepCard('1', <>Buka POSYANDU NYAWIJI di <strong>{browserLabel}</strong>.</>)}
        {stepCard('2', <>Ketuk ikon <strong>menu titik tiga</strong> <span className="inline-flex align-middle mx-1">&#8942;&#8942; / &#8801;</span> di pojok kanan atas.</>)}
        {stepCard('3', <>Pilih <strong>&ldquo;Instal aplikasi&rdquo;</strong>, <strong>&ldquo;Tambahkan ke Layar Utama&rdquo;</strong>, atau <strong>&ldquo;Instal halaman&rdquo;</strong>.</>)}
        {stepCard('4', <>Ketuk <strong>Instal / Tambahkan</strong> untuk konfirmasi. Ikon POSYANDU NYAWIJI akan tersimpan di layar utama.</>)}
      </ul>
    ) : guide === 'desktop' ? (
      <ul className="space-y-3">
        {stepCard('1', <>Di <strong>{browserLabel}</strong>, klik ikon <strong>Instal</strong> <span className="inline-flex align-middle mx-1">&#11015;</span> di sisi kanan bilah alamat (address bar).</>)}
        {stepCard('2', <>Bila tidak terlihat, buka menu <strong>titik tiga</strong> di pojok kanan atas lalu pilih <strong>&ldquo;Cast, simpan, dan bagikan&rdquo; &rarr; &ldquo;Instal halaman sebagai aplikasi&rdquo;</strong>.</>)}
        {stepCard('3', <>Klik <strong>Instal</strong>. Aplikasi akan terbuka seperti aplikasi desktop biasa.</>)}
      </ul>
    ) : (
      <div className="p-3.5 bg-[#fffbeb] border border-[#f59e0b]/40 rounded-2xl flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 shrink-0 text-[#f59e0b] mt-0.5" />
        <p className="text-xs text-[#92400e] font-medium leading-relaxed">
          Tombol <strong>INSTALL otomatis</strong> belum didukung <strong>{browserLabel}</strong> pada perangkat ini.
          Silakan gunakan browser lain bila ingin memakai tombol ini — disarankan <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong> (di HP Android maupun komputer) — atau pasang manual lewat menu browser
          (contoh di HP: menu <span>&#8942;&#8942;</span> &rarr; <em>Tambahkan ke layar utama</em>).
        </p>
      </div>
    );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden border border-[#e9edef] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#075e54] text-white px-5 pt-5 pb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl shrink-0">
              <Download className="w-5 h-5 text-[#25d366]" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm leading-snug">Install Aplikasi POSYANDU NYAWIJI</h2>
              <p className="text-[11px] text-[#e9edef] mt-0.5">{headline}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {body}

          <div className="p-3.5 bg-[#e7fceb] border border-[#25d366]/30 rounded-2xl text-[11px] text-[#075e54] font-medium leading-relaxed flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#128c7e] mt-0.5" />
            <span>
              Setelah terpasang, aplikasi tampil <strong>layar penuh seperti aplikasi biasa</strong> (tanpa bilah alamat)
              dan tetap bisa dipakai saat sinyal hilang. Butuh koneksi internet hanya pada proses pemasangan pertama.
            </span>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-[#e9edef] bg-[#fafafa]">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#128c7e] hover:bg-[#075e54] text-white font-bold rounded-full text-sm shadow-md transition-all touch-press flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            <span>Mengerti, Tutup</span>
          </button>
        </div>
      </div>
    </div>
  );
};

