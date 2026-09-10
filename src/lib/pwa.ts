'use client';

import { useCallback, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallGuide = 'ios' | 'android' | 'desktop' | 'unsupported';

export type InstallTapResult = { action: 'prompted' } | { action: 'guide'; guide: InstallGuide };

// ---------------------------------------------------------------------------
// State tingkat-modul (singleton).
//
// Event `beforeinstallprompt` hanya dipancarkan SEKALI per page load. Bila
// listener dipasang per-komponen (sebelumnya di dalam useEffect), event bisa
// hilang saat komponen unmount — mis. login page hilang setelah login sukses,
// lalu Header memasang listener baru dan prompt sudah tidak ada. Menyimpan
// prompt & status di tingkat modul membuatnya bertahan lintas mount.
// ---------------------------------------------------------------------------

let initialized = false;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let ready = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function readInstalled(): boolean {
  return isStandaloneMode();
}

function init() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const onBeforeInstallPrompt = (event: Event) => {
    // Tahan prompt bawaan browser agar hanya tombol "INSTALL APLIKASI" kita
    // yang memicunya (dan prompt bisa dipakai lagi kapan pun).
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  };

  const onAppInstalled = () => {
    installed = true;
    deferredPrompt = null;
    emit();
  };

  const onDisplayModeChange = (event: MediaQueryListEvent) => {
    installed = event.matches;
    emit();
  };

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);

  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onDisplayModeChange);
  } else if (
    typeof (mediaQuery as { addListener?: (cb: (e: MediaQueryListEvent) => void) => void }).addListener ===
    'function'
  ) {
    (mediaQuery as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(
      onDisplayModeChange
    );
  }

  // Deteksi status awal ditunda (bukan sinkron saat import) agar tidak memicu
  // cascading render / hydration mismatch.
  window.setTimeout(() => {
    installed = readInstalled();
    ready = true;
    emit();
  }, 0);
}

// Pasang listener sedini mungkin saat modul dimuat di browser — sebelum React
// sempat melewatkan event.
if (typeof window !== 'undefined') init();

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

interface PwaSnapshot {
  ready: boolean;
  installed: boolean;
  canNativePrompt: boolean;
}

export function usePwaInstall() {
  const [snapshot, setSnapshot] = useState<PwaSnapshot>(() => ({
    ready: false,
    installed: false,
    canNativePrompt: false,
  }));

  useEffect(() => {
    init();
    const update = () =>
      setSnapshot({
        ready,
        installed,
        canNativePrompt: Boolean(deferredPrompt),
      });
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
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
    if (isStandaloneMode() || readInstalled()) return null;

    const prompt = deferredPrompt;
    if (prompt) {
      deferredPrompt = null;
      emit();
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice?.outcome === 'accepted') {
          installed = true;
          emit();
        }
        return { action: 'prompted' };
      } catch {
        return { action: 'guide', guide: guideForPlatform() };
      }
    }

    return { action: 'guide', guide: guideForPlatform() };
  }, []);

  return {
    /** Sembunyikan tombol saat belum ter-hydrate, sudah terpasang, atau berjalan sebagai aplikasi. */
    showInstallButton: snapshot.ready && !snapshot.installed,
    canNativePrompt: snapshot.canNativePrompt,
    install,
  };
}
