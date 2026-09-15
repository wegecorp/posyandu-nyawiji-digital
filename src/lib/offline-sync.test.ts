// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import {
  getSyncQueue,
  addToSyncQueue,
  flushSyncQueue,
  clearSyncQueue,
  clearQueuedMeasurement,
  clearQueuedPatient,
  useAutoSave,
  genClientId,
  type UnsyncedItem,
} from '@/lib/offline-sync';

function measurementItem(overrides: Partial<UnsyncedItem> = {}): UnsyncedItem {
  return {
    kind: 'measurement',
    id: genClientId(),
    patientId: 'p1',
    posyanduId: 'pos1',
    payload: { weight: '8.5', sessionDate: '2026-01-10' },
    timestamp: 1700000000000,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  cleanup();
});

describe('addToSyncQueue dedupe', () => {
  it('menggabung edit offline pasien sama + tanggal sesi sama', () => {
    const a = measurementItem({ payload: { weight: '8.5', sessionDate: '2026-01-10' } });
    const b = measurementItem({ payload: { height: '70', sessionDate: '2026-01-10' } });
    addToSyncQueue(a);
    addToSyncQueue(b);
    const queue = getSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].payload.weight).toBe('8.5');
    expect(queue[0].payload.height).toBe('70');
  });

  it('TIDAK menggabung dua tanggal sesi berbeda (data backdate tidak boleh tertimpa)', () => {
    const a = measurementItem({ payload: { weight: '8.5', sessionDate: '2026-01-10' } });
    const b = measurementItem({ payload: { weight: '9.0', sessionDate: '2026-02-14' } });
    addToSyncQueue(a);
    addToSyncQueue(b);
    const queue = getSyncQueue();
    expect(queue).toHaveLength(2);
    const dates = queue.map((q) => q.payload.sessionDate).sort();
    expect(dates).toEqual(['2026-01-10', '2026-02-14']);
  });

  it('edit tanggal sama tapi field sama digabung, tanggal terakhir menang', () => {
    const a = measurementItem({ payload: { weight: '8.5', sessionDate: '2026-01-10' } });
    const b = measurementItem({ payload: { weight: '8.7', sessionDate: '2026-01-10' } });
    addToSyncQueue(a);
    addToSyncQueue(b);
    const queue = getSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].payload.weight).toBe('8.7');
  });
});

describe('flushSyncQueue drop semantics', () => {
  it('409 measurement = conflict: item dibuang tapi dilaporkan', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Data usang' }), { status: 409 })
    );
    vi.stubGlobal('fetch', fetchMock);
    addToSyncQueue(measurementItem());
    const result = await flushSyncQueue();
    expect(result.flushed).toBe(0);
    expect(result.conflicts).toEqual([{ patientId: 'p1', posyanduId: 'pos1' }]);
    expect(getSyncQueue()).toHaveLength(0);
  });

  it('401/403 = retry: item TETAP di antrean (perlindungan flush akun lain)', async () => {
    for (const status of [401, 403]) {
      localStorage.clear();
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status }));
      vi.stubGlobal('fetch', fetchMock);
      addToSyncQueue(measurementItem());
      const result = await flushSyncQueue();
      expect(result.flushed).toBe(0);
      expect(result.conflicts).toHaveLength(0);
      expect(getSyncQueue()).toHaveLength(1);
    }
  });

  it('400/404 = drop permanen (data invalid/terhapus)', async () => {
    for (const status of [400, 404]) {
      localStorage.clear();
      const fetchMock = vi.fn().mockResolvedValue(new Response('', { status }));
      vi.stubGlobal('fetch', fetchMock);
      addToSyncQueue(measurementItem());
      const result = await flushSyncQueue();
      expect(result.flushed).toBe(1);
      expect(getSyncQueue()).toHaveLength(0);
    }
  });

  it('5xx = retry: item TETAP, flush berhenti', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    addToSyncQueue(measurementItem());
    const result = await flushSyncQueue();
    expect(result.flushed).toBe(0);
    expect(getSyncQueue()).toHaveLength(1);
  });

  it('mengirim sessionDate + version epoch detik pada payload autosave', async () => {
    let postedBody!: Record<string, unknown>;
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      postedBody = JSON.parse(String(init?.body));
      return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    addToSyncQueue(
      measurementItem({ payload: { weight: '8.5', sessionDate: '2026-01-10' }, timestamp: 1700000000000 })
    );
    await flushSyncQueue();
    expect(postedBody).toMatchObject({ patientId: 'p1', sessionDate: '2026-01-10' });
    expect(postedBody?.version).toBe(1700000000);
  });
});

describe('useAutoSave pending merge', () => {
  it('ketik 2 field dalam <600ms = SATU autosave berisi kedua field (bug hilang data)', async () => {
    const postedBodies: Record<string, unknown>[] = [];
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      postedBodies.push(JSON.parse(String(init?.body)));
      return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    const { result } = renderHook(() => useAutoSave('p1', 'pos1', 'Kader Sari'));

    act(() => {
      result.current.triggerAutoSave({ weight: '8.5', sessionDate: '2026-01-10' });
      result.current.triggerAutoSave({ height: '70', sessionDate: '2026-01-10' });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    // Hanya satu request — gabungan weight + height (bukan request terpisah yg saling membatalkan).
    expect(postedBodies).toHaveLength(1);
    expect(postedBodies[0]).toMatchObject({ weight: '8.5', height: '70', sessionDate: '2026-01-10' });
  });

  it('saat offline, snapshot + sessionDate masuk antrean lokal', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const { result } = renderHook(() => useAutoSave('p1', 'pos1', 'Kader Sari'));

    act(() => {
      result.current.triggerAutoSave({ weight: '8.5', sessionDate: '2026-01-10' });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    const queue = getSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].patientId).toBe('p1');
    expect(queue[0].payload).toMatchObject({ weight: '8.5', sessionDate: '2026-01-10' });
    expect(result.current.saveStatus).toBe('offline_queued');
  });

  it('flush pada mount melaporkan konflik milik pasien yang sedang dibuka', async () => {
    // Item konflik utk p1 tersimpan sebelum mount.
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'stale' }), { status: 409 })
    );
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem(
      'posyandu_offline_sync_queue',
      JSON.stringify([measurementItem({ patientId: 'p1', posyanduId: 'pos1' })])
    );

    const { result } = renderHook(() => useAutoSave('p1', 'pos1', 'Kader Sari'));

    await vi.waitFor(() => expect(result.current.saveStatus).toBe('conflict'));
  });
});

describe('clearSyncQueue', () => {
  it('menghapus semua item', () => {
    addToSyncQueue(measurementItem());
    addToSyncQueue(measurementItem({ patientId: 'p2' }));
    clearSyncQueue();
    expect(getSyncQueue()).toHaveLength(0);
  });
});

describe('sesi berbasis bulan', () => {
  it('dua tanggal di BULAN yang sama digabung jadi satu sesi', () => {
    const a = measurementItem({ payload: { weight: '8.5', sessionDate: '2026-01-10' } });
    const b = measurementItem({ payload: { height: '70', sessionDate: '2026-01-25' } });
    addToSyncQueue(a);
    addToSyncQueue(b);
    expect(getSyncQueue()).toHaveLength(1);
  });

  it('clearQueuedMeasurement hanya buang bulan yang diminta', () => {
    addToSyncQueue(measurementItem({ payload: { weight: '8.5', sessionDate: '2026-01-10' } }));
    addToSyncQueue(measurementItem({ payload: { weight: '9.0', sessionDate: '2026-02-14' } }));
    addToSyncQueue(measurementItem({ patientId: 'p2', payload: { weight: '7', sessionDate: '2026-01-10' } }));
    clearQueuedMeasurement('p1', '2026-01');
    const queue = getSyncQueue();
    expect(queue).toHaveLength(2);
    expect(queue.every((q) => !(q.patientId === 'p1' && String(q.payload.sessionDate).startsWith('2026-01')))).toBe(true);
  });

  it('clearQueuedPatient buang semua antrean pasien itu saja', () => {
    addToSyncQueue(measurementItem({ patientId: 'p1' }));
    addToSyncQueue(measurementItem({ patientId: 'p1', payload: { weight: '9', sessionDate: '2026-03-10' } }));
    addToSyncQueue(measurementItem({ patientId: 'p2', payload: { weight: '7', sessionDate: '2026-03-10' } }));
    clearQueuedPatient('p1');
    const queue = getSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].patientId).toBe('p2');
  });
});
