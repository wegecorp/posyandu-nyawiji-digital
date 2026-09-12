import type { ReactNode } from 'react';
import Link from 'next/link';
import { APP_NAME, APP_ORG } from '@/lib/branding';

interface LegalPageProps {
  title: string;
  updated: string;
  children: ReactNode;
}

export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-[#f0f2f5] text-[#111b21]">
      <header className="bg-[#075e54] text-white">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full transition-colors"
          >
            <span aria-hidden>&larr;</span> Kembali
          </Link>
          <h1 className="font-black text-base leading-tight">{title}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">
        <div className="bg-white border border-[#e9edef] rounded-2xl p-5 sm:p-7 shadow-xs space-y-5 text-sm leading-relaxed">
          <p className="text-[11px] font-bold text-[#54656f] uppercase tracking-wide">
            Terakhir diperbarui: {updated}
          </p>
          {children}
        </div>
        <p className="text-center text-xs text-[#54656f] mt-4">
          © 2026 {APP_NAME} — {APP_ORG}
        </p>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="font-extrabold text-[#075e54] text-sm">{title}</h2>
      <div className="space-y-1.5 text-[#111b21]">{children}</div>
    </section>
  );
}
