'use client';

/**
 * Navigasi tombol back (hardware Android / browser) untuk aplikasi SPA 1-route.
 *
 * Aplikasi ini tidak memakai router: setiap "layar"/modal adalah state React,
 * sehingga tanpa history entry tombol back menutup PWA. Modul ini menjaga satu
 * stack handler; tiap layer (layar/modal) menggeser satu history entry. Back
 * memanggil handler teratas (LIFO). Saat stack kosong, exit-guard memakai pola
 * "back dua kali": back pertama menahan keluar + memanggil `onExit` (tampilkan
 * hint), back kedua dalam jendela waktu dibiarkan lewat sehingga OS/browser
 * menutup aplikasi secara native.
 */

import { useEffect, useRef } from 'react';

type BackHandler = () => void;

/** `null` = tombstone (entry history milik layer yang ditutup programatik). */
type Layer = { id: number; onBack: BackHandler } | null;

/** Jendela waktu (ms) antara back pertama dan back kedua untuk keluar. */
const EXIT_ARM_WINDOW_MS = 2000;

const layers: Layer[] = [];
let exitGuardActive = false;
let exitGuardOnExit: BackHandler | null = null;
let nextId = 1;
let suppressPop = 0;
let listenerAttached = false;
let exitArmed = false;
let exitArmTimer: ReturnType<typeof setTimeout> | null = null;
/** Tag unik entry guard yang sedang aktif (agar entry guard basi tak salah dikenali). */
let guardTag: string | null = null;

function pushGuardEntry() {
  if (typeof window !== 'undefined' && guardTag) window.history.pushState({ bn: guardTag }, '');
}

/**
 * Tag entry history yang SEDANG aktif (`history.state.bn`). Dipakai sebelum
 * `history.back()`: mundur hanya bila entry milik layer masih aktif. Kalau tidak
 * (entry sudah dikonsumsi / `layers` desync), `back()` akan melewati entry app
 * dan tab keluar ke homepage/New Tab browser.
 */
function currentHistoryTag(): string | null {
  if (typeof window === 'undefined') return null;
  const state = window.history.state as { bn?: unknown } | null | undefined;
  if (!state || state.bn === undefined || state.bn === null) return null;
  return String(state.bn);
}

function disarmExit() {
  exitArmed = false;
  if (exitArmTimer !== null) {
    clearTimeout(exitArmTimer);
    exitArmTimer = null;
  }
}

function handlePopState() {
  if (suppressPop > 0) {
    suppressPop -= 1;
    return;
  }

  const top = layers[layers.length - 1];
  if (top) {
    layers.pop();
    top.onBack();
    return;
  }
  // Tombstone dipakai entry history yang ditinggalkan penutupan programatik.
  if (layers.length > 0) {
    layers.pop();
    return;
  }
  if (!exitGuardActive) return;

  // Back kedua dalam jendela waktu: jangan tahan lagi — biarkan browser/OS
  // menutup aplikasi secara native.
  if (exitArmed) {
    disarmExit();
    return;
  }

  // Back pertama: tahan keluar, minta hint, lalu re-arm bila waktu habis.
  exitArmed = true;
  exitArmTimer = setTimeout(() => {
    exitArmed = false;
    exitArmTimer = null;
    if (exitGuardActive) pushGuardEntry();
  }, EXIT_ARM_WINDOW_MS);
  exitGuardOnExit?.();
}

function attachListener() {
  if (listenerAttached || typeof window === 'undefined') return;
  listenerAttached = true;
  window.addEventListener('popstate', handlePopState);
}

/**
 * Turunkan satu layer navigasi. `active` true = layer tampil; `onBack` dipanggil
 * saat tombol back menutup layer. Hook wajib dipanggil tanpa kondisi.
 */
export function useBackLayer(active: boolean, onBack: BackHandler) {
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!active) return;
    attachListener();
    const id = nextId++;
    layers.push({ id, onBack: () => onBackRef.current() });
    window.history.pushState({ bn: id }, '');

    return () => {
      const idx = layers.findIndex((l) => l && l.id === id);
      if (idx === -1) return; // sudah dikonsumsi popstate
      if (idx === layers.length - 1) {
        // Top: buang entry history miliknya tanpa memicu handler layer lain.
        layers.splice(idx, 1);
        // Mundur hanya bila entry layer ini masih entry aktif. Bila sudah
        // dikonsumsi (layers desync), jangan back() — mencegah overshoot keluar app.
        if (currentHistoryTag() === String(id)) {
          suppressPop += 1;
          window.history.back();
        }
      } else {
        // Tengah: sisakan tombstone; entry-nya dimakan back berikutnya (no-op).
        layers[idx] = null;
      }
    };
  }, [active]);
}

/**
 * Guard layar root (khusus mode standalone/PWA). Saat back ditekan tanpa layer
 * aktif: back pertama memanggil `onExit` (tampilkan hint "tekan kembali sekali
 * lagi") dan menahan keluar; back kedua dalam `EXIT_ARM_WINDOW_MS` dibiarkan
 * lewat sehingga OS menutup aplikasi.
 */
export function useExitGuard(enabled: boolean, onExit: BackHandler) {
  const onExitRef = useRef(onExit);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    if (!enabled) return;
    attachListener();
    exitGuardActive = true;
    exitGuardOnExit = () => onExitRef.current();
    guardTag = `g${nextId++}`;
    pushGuardEntry();

    return () => {
      disarmExit();
      exitGuardActive = false;
      exitGuardOnExit = null;
      // Sama seperti layer: hanya mundur bila entry guard INI masih aktif.
      if (layers.length === 0 && guardTag !== null && currentHistoryTag() === guardTag) {
        suppressPop += 1;
        window.history.back();
      }
      guardTag = null;
    };
  }, [enabled]);
}
