'use client';

import { useCallback, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallGuide = 'ios' | 'android' | 'desktop' | 'unsupported';

export type InstallTapResult = { action: 'prompted' } | { action: 'guide'; guide: InstallGuide };

const INSTALLED_FLAG_KEY = 'nyawiji_pwa_installed';

function safeLocalStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* abaikan bila storage tidak tersedia */
  }
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function detectPlatform() {
  if (typeof navigator === 'undefined') {
    return { isIOS: false, isAndroid: false, isDesktop: false, browser: 'unknown' as string };
  }

  const ua = navigator.userAgent;
  const isIPadOS =
    ua.includes('Macintosh') && typeof document !== 'undefined' && 'ontouchend' in document;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPadOS;
  const isAndroid = /Android/i.test(ua);

  let browser = 'unknown';
  if (/EdgA?|Edge/.test(ua)) browser = 'edge';
  else if (/OPR|Opera/.test(ua)) browser = 'opera';
  else if (/SamsungBrowser/.test(ua)) browser = 'samsung';
  else if (/CriOS/.test(ua)) browser = 'chrome-ios';
  else if (/Firefox/.test(ua)) browser = 'firefox';
  else if (/Chrome|Chromium/.test(ua)) browser = 'chrome';
  else if (/Safari/.test(ua)) browser = 'safari';

  return { isIOS, isAndroid, isDesktop: !isIOS && !isAndroid, browser };
}

/**
 * Pilih panduan pasang manual sesuai perangkat/browser saat tombol dipakai
 * padahal dialog instal otomatis (beforeinstallprompt) tidak tersedia.
 */
export function guideForPlatform(): InstallGuide {
  const { isIOS, isAndroid, browser } = detectPlatform();
  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  if (browser === 'chrome' || browser === 'edge') return 'desktop';
  return 'unsupported';
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Deteksi status awal ditunda sebentar (bukan sinkron di body effect) agar
    // tidak memicu cascading render & tidak menimbulkan hydration mismatch.
    const detectTimer = window.setTimeout(() => {
      setInstalled(safeLocalStorageGet(INSTALLED_FLAG_KEY) === '1' || isStandaloneMode());
      setReady(true);
    }, 0);

    const onBeforeInstallPrompt = (event: Event) => {
      // Tahan prompt bawaan browser agar tombol "INSTALL APLIKASI" kita yang memicunya.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      safeLocalStorageSet(INSTALLED_FLAG_KEY, '1');
    };

    const onDisplayModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setInstalled(true);
        safeLocalStorageSet(INSTALLED_FLAG_KEY, '1');
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onDisplayModeChange);
    } else if (typeof (mediaQuery as { addListener?: (cb: (e: MediaQueryListEvent) => void) => void }).addListener === 'function') {
      (mediaQuery as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(onDisplayModeChange);
    }

    return () => {
      window.clearTimeout(detectTimer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', onDisplayModeChange);
      }
    };
  }, []);

  /**
   * Dipanggil saat tombol INSTALL diketuk.
   * - Bila dialog otomatis tersedia (Chrome/Edge/Samsung Internet) -> picu prompt().
   * - Bila tidak tersedia (Safari iPhone/iPad, Firefox, dsb.) -> kembalikan panduan
   *   yang harus ditampilkan (pasang manual atau info browser tidak didukung).
   */
  const install = useCallback(async (): Promise<InstallTapResult | null> => {
    if (typeof window === 'undefined') return null;
    if (isStandaloneMode() || safeLocalStorageGet(INSTALLED_FLAG_KEY) === '1') return null;

    if (deferredPrompt) {
      const prompt = deferredPrompt;
      setDeferredPrompt(null);
      try {
        await prompt.prompt();
      } catch {
        return { action: 'guide', guide: guideForPlatform() };
      }
      return { action: 'prompted' };
    }

    return { action: 'guide', guide: guideForPlatform() };
  }, [deferredPrompt]);

  return {
    /** Sembunyikan tombol saat belum ter-hydrate, sudah terpasang, atau berjalan sebagai aplikasi. */
    showInstallButton: ready && !installed,
    canNativePrompt: Boolean(deferredPrompt),
    install,
  };
}
