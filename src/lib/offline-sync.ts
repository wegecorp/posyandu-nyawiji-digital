'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type FieldValue = string | number | null | undefined;

export interface UnsyncedItem {
  kind: 'measurement' | 'patient';
  id: string;
  patientId?: string;
  posyanduId?: string;
  clientId?: string;
  payload: Record<string, FieldValue>;
  timestamp: number;
}

const QUEUE_KEY = 'posyandu_offline_sync_queue';

export function genClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getSyncQueue(): UnsyncedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading sync queue:', e);
    return [];
  }
}

/**
 * Kunci dedupe antrean:
 * - measurement: posyanduId + patientId + BULAN sesi (YYYY-MM). Sesi = 1 bulan, jadi edit
 *   offline pada dua tanggal berbeda di bulan yang sama digabung; bulan berbeda TIDAK.
 * - patient: clientId (idempotensi registrasi offline).
 */
export function queueKey(item: UnsyncedItem): string {
  if (item.kind === 'measurement') {
    const ym =
      typeof item.payload.sessionDate === 'string'
        ? String(item.payload.sessionDate).slice(0, 7)
        : 'no-date';
    return `m:${item.posyanduId || ''}:${item.patientId || ''}:${ym}`;
  }
  return `p:${item.clientId || item.id}`;
}

function writeQueue(queue: UnsyncedItem[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error writing sync queue:', e);
  }
}

export function addToSyncQueue(item: UnsyncedItem) {
  if (typeof window === 'undefined') return;
  try {
    const queue = getSyncQueue();
    const key = queueKey(item);
    const existingIndex = queue.findIndex((q) => queueKey(q) === key);
    if (existingIndex >= 0) {
      queue[existingIndex] = {
        ...queue[existingIndex],
        payload: { ...queue[existingIndex].payload, ...item.payload },
        timestamp: Date.now(),
      };
    } else {
      queue.push(item);
    }
    writeQueue(queue);
  } catch (e) {
    console.error('Error adding to sync queue:', e);
  }
}

export function clearItemFromQueue(id: string) {
  if (typeof window === 'undefined') return;
  const queue = getSyncQueue().filter((q) => q.id !== id);
  writeQueue(queue);
}

export function clearSyncQueue() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch (e) {
    console.error('Error clearing sync queue:', e);
  }
}

/**
 * Buang antrean pengukuran pasien untuk BULAN tertentu. Dipakai setelah sesi
 * dihapus, supaya patch offline yang belum terkirim tidak menghidupkan ulang
 * baris yang baru saja dihapus di server.
 */
export function clearQueuedMeasurement(patientId: string, ym: string) {
  if (typeof window === 'undefined') return;
  const queue = getSyncQueue().filter(
    (q) =>
      !(
        q.kind === 'measurement' &&
        q.patientId === patientId &&
        typeof q.payload.sessionDate === 'string' &&
        String(q.payload.sessionDate).slice(0, 7) === ym
      ),
  );
  writeQueue(queue);
}

/** Buang SEMUA antrean milik pasien (dipakai saat pasien dihapus permanen). */
export function clearQueuedPatient(patientId: string) {
  if (typeof window === 'undefined') return;
  writeQueue(getSyncQueue().filter((q) => q.patientId !== patientId));
}

/**
 * Kirim satu item. Hasil:
 * - 'ok'       : sukses, atau kegagalan permanen yang memang layak dibuang (invalid / sudah terhapus).
 * - 'retry'    : tahan item utk percobaan berikutnya (jaringan, 429, 5xx, sesi tak valid/akun beda).
 * - 'conflict' : data offline kalah versi dgn data tersimpan (measurement 409) — item dibuang tapi
 *                wajib dilaporkan ke UI agar tidak hilang diam-diam.
 */
type FlushResult = 'ok' | 'retry' | 'conflict';

async function postItem(item: UnsyncedItem): Promise<FlushResult> {
  const headers = { 'Content-Type': 'application/json' };

  const doFetch = (): Promise<Response> => {
    if (item.kind === 'patient') {
      return fetch('/api/patients', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...item.payload, clientId: item.clientId, force: true }),
      });
    }
    return fetch('/api/measurements/autosave', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        patientId: item.patientId,
        posyanduId: item.posyanduId,
        ...item.payload,
        version: Math.floor(item.timestamp / 1000),
      }),
    });
  };

  let res: Response;
  try {
    res = await doFetch();
  } catch (e) {
    // Jaringan putus / timeout: pertahankan utk retry.
    console.warn('Network error while syncing item:', e);
    return 'retry';
  }

  if (res.ok) return 'ok';
  const status = res.status;

  // Invalid / data sudah terhapus di server: drop permanen.
  if (status === 400 || status === 404) return 'ok';
  // Sesi tak valid / akun tidak punya akses (mis. antrean milik akun lain): JANGAN drop,
  // data akan hilang tanpa kabar. Biarkan utk ditangani logout/clear.
  if (status === 401 || status === 403) return 'retry';
  // Measurement kalah versi dgn simpanan lain yg lebih baru.
  if (status === 409) {
    if (item.kind === 'measurement') return 'conflict';
    // Pasien duplikat (clientId sama sudah terdaftar) = sukses idempoten.
    return 'ok';
  }
  // 429 / 5xx / lainnya: tahan utk retry.
  return 'retry';
}

export interface FlushResultInfo {
  flushed: number;
  conflicts: Array<{ patientId?: string; posyanduId?: string }>;
}

let flushing = false;

export async function flushSyncQueue(): Promise<FlushResultInfo> {
  if (typeof window === 'undefined') return { flushed: 0, conflicts: [] };
  if (flushing) return { flushed: 0, conflicts: [] }; // cegah flush ganda paralel.

  flushing = true;
  try {
    const queue = getSyncQueue();
    let flushed = 0;
    const conflicts: FlushResultInfo['conflicts'] = [];
    let kept: UnsyncedItem[] = [];

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      try {
        const result = await postItem(item);
        if (result === 'ok') {
          flushed++;
        } else if (result === 'conflict') {
          // Data dikalahkan server; item dibuang, konflik dilaporkan ke UI.
          conflicts.push({ patientId: item.patientId, posyanduId: item.posyanduId });
        } else {
          // retry — pertahankan item ini + sisanya utk percobaan berikutnya.
          kept = queue.slice(i);
          break;
        }
      } catch (e) {
        console.error('Failed to sync item:', item, e);
        kept = queue.slice(i);
        break;
      }
    }

    if (kept.length !== queue.length || flushed > 0 || conflicts.length > 0) {
      writeQueue(kept);
    }
    return { flushed, conflicts };
  } finally {
    flushing = false;
  }
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline_queued' | 'error' | 'conflict';

export function useAutoSave(patientId: string, posyanduId: string, recordedBy?: string) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  // Semua field yang berubah namun belum terkirim. Dibuat per-field, bukan per-request,
  // supaya ketikan cepat lintas-field (BB -> TB -> LiLA < 600ms) tidak saling membatalkan.
  const pendingRef = useRef<Record<string, FieldValue>>({});
  const busyRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const queueSnapshot = useCallback(
    (snapshot: Record<string, FieldValue>) => {
      if (Object.keys(snapshot).length === 0) return;
      addToSyncQueue({
        kind: 'measurement',
        id: genClientId(),
        patientId,
        posyanduId,
        payload: snapshot,
        timestamp: Date.now(),
      });
    },
    [patientId, posyanduId]
  );

  // Kirim satu snapshot. Return string status utk call site yg butuh nilai balik.
  const sendSnapshot = useCallback(
    async (
      snapshot: Record<string, FieldValue>,
      opts?: { keepalive?: boolean; silent?: boolean }
    ): Promise<SaveStatus> => {
      const fields = Object.keys(snapshot);
      if (fields.length === 0) return 'idle';

      const payload = {
        patientId,
        posyanduId,
        recordedBy: recordedBy || 'Kader',
        ...snapshot,
      };

      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        queueSnapshot(snapshot);
        if (!opts?.silent) {
          setSaveStatus('offline_queued');
          setLastSavedAt(new Date());
        }
        return 'offline_queued';
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4_000);
        const res = await fetch('/api/measurements/autosave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, version: Math.floor(Date.now() / 1000) }),
          signal: controller.signal,
          keepalive: opts?.keepalive,
        });
        clearTimeout(timeoutId);

        if (res.status === 409) {
          if (!opts?.silent) {
            setSaveStatus('error');
          }
          return 'error';
        }
        if (!res.ok) {
          throw new Error('Server returned error');
        }
        await res.json();
        if (!opts?.silent) {
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        }
        return 'saved';
      } catch (err) {
        // Jaringan mati / timeout (10s): simpan ke antrean lokal. Aman di-queue ulang
        // karena server menimpa baris (patientId + tanggal) idempotent per field.
        console.warn('Network issue during autosave, queuing locally:', err);
        queueSnapshot(snapshot);
        if (!opts?.silent) {
          setSaveStatus('offline_queued');
          setLastSavedAt(new Date());
        }
        return 'offline_queued';
      }
    },
    [patientId, posyanduId, recordedBy, queueSnapshot]
  );

  const runFlush = useCallback(
    async (opts?: { keepalive?: boolean; silent?: boolean }) => {
      if (busyRef.current) return;
      const snapshot = pendingRef.current;
      if (Object.keys(snapshot).length === 0) return;

      pendingRef.current = {};
      busyRef.current = true;
      try {
        await sendSnapshot(snapshot, opts);
      } finally {
        busyRef.current = false;
        // Ada field baru selama pengiriman: flush lagi sebentar lagi.
        if (Object.keys(pendingRef.current).length > 0) {
          debounceTimerRef.current = setTimeout(() => {
            void runFlush();
          }, 150);
        }
      }
    },
    [sendSnapshot]
  );

  // Kirim segera antrean tertunda (dipakai saat ganti tanggal sesi / sebelum keluar form).
  // Mengembalikan Promise yang selesai setelah antrean benar-benar terkirim, supaya
  // pemanggil (mis. ganti tanggal sesi) bisa menunggu sebelum mengubah konteks tanggal.
  const flushNow = useCallback(async (): Promise<void> => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    // Tunggu bila ada pengiriman yang sedang berjalan agar pending lama tidak tertimpa
    // patch bergaya tanggal baru (race F9).
    let guard = 0;
    while (busyRef.current && guard < 400) {
      await new Promise((r) => setTimeout(r, 25));
      guard++;
    }
    await runFlush();
  }, [runFlush]);

  // Flush saat tanggal sesi diubah: pastikan field lama terkirim ke tanggal yg benar.
  const triggerAutoSave = useCallback(
    (fieldUpdates: Record<string, FieldValue>, delayMs: number = 600) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      pendingRef.current = { ...pendingRef.current, ...fieldUpdates };
      setSaveStatus('saving');
      debounceTimerRef.current = setTimeout(() => {
        void runFlush();
      }, delayMs);
    },
    [runFlush]
  );

  useEffect(() => {
    mountedRef.current = true;
    const handleOnline = () => {
      setIsOnline(true);
      void flushSyncQueue().then((r) => {
        if (mountedRef.current && r.conflicts.some((c) => c.patientId === patientId)) {
          setSaveStatus('conflict');
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Flush immediately on mount if already online (handles page reload).
    if (navigator.onLine) {
      void flushSyncQueue().then((r) => {
        if (mountedRef.current && r.conflicts.some((c) => c.patientId === patientId)) {
          setSaveStatus('conflict');
        }
      });
    }

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [patientId]);

  // Saat form ditutup / pasien berpindah: jangan biarkan nilai dalam jendela debounce 600ms
  // hilang begitu saja. Kirim keepalive; bila offline, masukkan ke antrean.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const snapshot = pendingRef.current;
      pendingRef.current = {};
      if (Object.keys(snapshot).length === 0) return;
      void sendSnapshot(snapshot, { keepalive: true, silent: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    saveStatus,
    lastSavedAt,
    isOnline,
    triggerAutoSave,
    flushNow,
    flushSyncQueue,
  };
}
