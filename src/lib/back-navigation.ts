'use client';

/**
 * Navigasi tombol back (hardware Android / browser) untuk aplikasi SPA 1-route.
 *
 * Aplikasi ini tidak memakai router: setiap "layar"/modal adalah state React,
 * sehingga tanpa history entry tombol back menutup PWA. Modul ini menjaga satu
 * stack handler; tiap layer (layar/modal) menggeser satu history entry. Back
 * memanggil handler teratas (LIFO). Saat stack kosong, exit-guard menahan
 * keluar aplikasi dan memunculkan konfirmasi.
 */

import { useEffect, useRef } from 'react';

type BackHandler = () => void;

/** `null` = tombstone (entry history milik layer yang ditutup programatik). */
type Layer = { id: number; onBack: BackHandler } | null;

const layers: Layer[] = [];
let exitGuardActive = false;
let exitGuardOnExit: BackHandler | null = null;
let nextId = 1;
let suppressPop = 0;
let listenerAttached = false;

function pushGuardEntry() {
  if (typeof window !== 'undefined') window.history.pushState({ bn: 'root' }, '');
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
  // Root: tahan keluar, tancapkan lagi entry guard, minta konfirmasi.
  if (exitGuardActive) {
    pushGuardEntry();
    exitGuardOnExit?.();
  }
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
 * Guard layar root. Saat back ditekan tanpa layer aktif, `onExit` dipanggil
 * (biasanya untuk membuka dialog konfirmasi keluar) dan aplikasi tetap hidup.
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
      exitGuardActive = false;
      exitGuardOnExit = null;
      if (layers.length === 0) {
        suppressPop += 1;
        window.history.back();
      }
    };
  }, [enabled]);
}

/** Keluar dari aplikasi: coba tutup window, fallback mundur keluar dari PWA. */
export function exitApp() {
  window.close();
  window.setTimeout(() => {
    window.history.go(-1);
  }, 60);
}
