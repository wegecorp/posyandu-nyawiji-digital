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

export function addToSyncQueue(item: UnsyncedItem) {
  if (typeof window === 'undefined') return;
  try {
    const queue = getSyncQueue();
    const existingIndex = queue.findIndex((q) =>
      item.kind === 'measurement'
        ? q.kind === 'measurement' && q.patientId === item.patientId
        : q.kind === 'patient' && q.clientId === item.clientId
    );
    if (existingIndex >= 0) {
      queue[existingIndex] = {
        ...queue[existingIndex],
        payload: { ...queue[existingIndex].payload, ...item.payload },
        timestamp: Date.now(),
      };
    } else {
      queue.push(item);
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error adding to sync queue:', e);
  }
}

export function clearItemFromQueue(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const queue = getSyncQueue().filter((q) => q.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error clearing item from queue:', e);
  }
}

async function postItem(item: UnsyncedItem): Promise<boolean> {
  const headers = { 'Content-Type': 'application/json' };
  let res: Response;

  if (item.kind === 'patient') {
    res = await fetch('/api/patients', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...item.payload, clientId: item.clientId, force: true }),
    });
  } else {
    res = await fetch('/api/measurements/autosave', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        patientId: item.patientId,
        posyanduId: item.posyanduId,
        ...item.payload,
        version: Math.floor(item.timestamp / 1000),
      }),
    });
  }

  if (res.ok) return true;
  // Drop permanen: payload invalid / akses ditolak / data usang / tidak ditemukan.
  if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404 || res.status === 409) {
    return true;
  }
  // 429 / 5xx / jaringan: pertahankan untuk retry nanti.
  return false;
}

export async function flushSyncQueue(): Promise<number> {
  const queue = getSyncQueue();
  let flushed = 0;

  for (const item of queue) {
    try {
      const ok = await postItem(item);
      if (ok) {
        clearItemFromQueue(item.id);
        flushed++;
      } else {
        break;
      }
    } catch (e) {
      console.error('Failed to sync item:', item, e);
      break;
    }
  }
  return flushed;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline_queued' | 'error';

export function useAutoSave(patientId: string, posyanduId: string, recordedBy?: string, version?: number) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void flushSyncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerAutoSave = useCallback(
    (fieldUpdates: Record<string, FieldValue>, delayMs: number = 600) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setSaveStatus('saving');

      debounceTimerRef.current = setTimeout(async () => {
        const payload = {
          patientId,
          posyanduId,
          recordedBy: recordedBy || 'Kader',
          ...fieldUpdates,
        };

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          addToSyncQueue({
            kind: 'measurement',
            id: genClientId(),
            patientId,
            posyanduId,
            payload: fieldUpdates,
            timestamp: Date.now(),
          });
          setSaveStatus('offline_queued');
          setLastSavedAt(new Date());
          return;
        }

        try {
          if (abortRef.current) abortRef.current.abort();
          const controller = new AbortController();
          abortRef.current = controller;
          const timeoutId = setTimeout(() => controller.abort(), 10_000);

          const versionToSend = version ?? Math.floor(Date.now() / 1000);
          const res = await fetch('/api/measurements/autosave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, version: versionToSend }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (res.status === 409) {
            setSaveStatus('error');
            return;
          }

          if (!res.ok) {
            throw new Error('Server returned error');
          }

          await res.json();
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            setSaveStatus('error');
            return;
          }
          console.warn('Network issue during autosave, queuing locally:', err);
          addToSyncQueue({
            kind: 'measurement',
            id: genClientId(),
            patientId,
            posyanduId,
            payload: fieldUpdates,
            timestamp: Date.now(),
          });
          setSaveStatus('offline_queued');
          setLastSavedAt(new Date());
        }
      }, delayMs);
    },
    [patientId, posyanduId, recordedBy, version]
  );

  return {
    saveStatus,
    lastSavedAt,
    isOnline,
    triggerAutoSave,
    flushSyncQueue,
  };
}
