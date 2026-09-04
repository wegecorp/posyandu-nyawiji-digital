'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UnsyncedItem {
  id: string;
  patientId: string;
  posyanduId: string;
  payload: Record<string, any>;
  timestamp: number;
}

const QUEUE_KEY = 'posyandu_offline_sync_queue';

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
    // Merge if same patient exists in queue
    const existingIndex = queue.findIndex((q) => q.patientId === item.patientId);
    if (existingIndex >= 0) {
      queue[existingIndex].payload = { ...queue[existingIndex].payload, ...item.payload };
      queue[existingIndex].timestamp = Date.now();
    } else {
      queue.push(item);
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error adding to sync queue:', e);
  }
}

export function clearItemFromQueue(patientId: string) {
  if (typeof window === 'undefined') return;
  try {
    const queue = getSyncQueue().filter((q) => q.patientId !== patientId);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error clearing item from queue:', e);
  }
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline_queued' | 'error';

export function useAutoSave(patientId: string, posyanduId: string, recordedBy?: string) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Flush queue when back online
      flushSyncQueue();
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

  const flushSyncQueue = async () => {
    const queue = getSyncQueue();
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        await fetch('/api/measurements/autosave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: item.patientId,
            posyanduId: item.posyanduId,
            ...item.payload,
          }),
        });
        clearItemFromQueue(item.patientId);
      } catch (e) {
        console.error('Failed to sync item:', item, e);
        break;
      }
    }
  };

  const triggerAutoSave = useCallback(
    (fieldUpdates: Record<string, any>, delayMs: number = 600) => {
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

        if (!navigator.onLine) {
          // Save to offline queue
          addToSyncQueue({
            id: `${patientId}_${Date.now()}`,
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
          const res = await fetch('/api/measurements/autosave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            throw new Error('Server returned error');
          }

          setSaveStatus('saved');
          setLastSavedAt(new Date());

          // Revert back to idle/saved after 2.5 seconds
          setTimeout(() => {
            setSaveStatus((prev) => (prev === 'saved' ? 'saved' : prev));
          }, 2500);
        } catch (err) {
          console.warn('Network issue during autosave, queuing locally:', err);
          addToSyncQueue({
            id: `${patientId}_${Date.now()}`,
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
    [patientId, posyanduId, recordedBy]
  );

  return {
    saveStatus,
    lastSavedAt,
    isOnline,
    triggerAutoSave,
    flushSyncQueue,
  };
}
