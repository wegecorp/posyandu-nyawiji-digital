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

function pushGuardEntry() {
  if (typeof window !== 'undefined') window.history.pushState({ bn: 'root' }, '');
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
        suppressPop += 1;
        window.history.back();
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
    pushGuardEntry();

    return () => {
      disarmExit();
      exitGuardActive = false;
      exitGuardOnExit = null;
      if (layers.length === 0) {
        suppressPop += 1;
        window.history.back();
      }
    };
  }, [enabled]);
}
