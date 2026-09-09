import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#059669",
};

export const metadata: Metadata = {
  title: "POSYANDU NYAWIJI",
  description: "Aplikasi Mobile Pelayanan & Pengukuran Posyandu Se-Kabupaten Gunungkidul",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "POSYANDU NYAWIJI",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full bg-slate-50 antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 selection:bg-emerald-200">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
