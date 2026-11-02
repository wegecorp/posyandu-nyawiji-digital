import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Audit Webview Diagnostik (Dev Only)',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
