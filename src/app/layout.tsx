import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { PwaServiceWorker } from "@/components/PwaServiceWorker";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/branding";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#059669",
};

export const metadata: Metadata = {
    title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  icons: {
    icon: [
      { url: "/brand/logo-192.png", type: "image/png", sizes: "192x192" },
      { url: "/brand/logo-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/brand/logo-apple-180.png", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  title: APP_NAME,
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
        <PwaServiceWorker />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
