// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

async function loadModule() {
  vi.resetModules();
  return await import('@/lib/back-navigation');
}

function pressBack() {
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

afterEach(() => cleanup());

describe('useBackLayer', () => {
  it('memanggil onBack saat tombol back ditekan', async () => {
    const { useBackLayer } = await loadModule();
    const onBack = vi.fn();

    renderHook(() => useBackLayer(true, onBack));
    pressBack();

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('menutup layer teratas lebih dulu (LIFO)', async () => {
    const { useBackLayer } = await loadModule();
    const first = vi.fn();
    const second = vi.fn();

    renderHook(() => useBackLayer(true, first));
    renderHook(() => useBackLayer(true, second));

    pressBack();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();

    pressBack();
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('tidak memanggil onBack untuk layer yang sudah tidak aktif', async () => {
    const { useBackLayer } = await loadModule();
    const onBack = vi.fn();

    const { rerender } = renderHook(({ active }) => useBackLayer(active, onBack), {
      initialProps: { active: true },
    });
    rerender({ active: false });
    pressBack();

    expect(onBack).not.toHaveBeenCalled();
  });
});

/**
 * Fake `window.history` dengan stack entry nyata, supaya bisa membedakan
 * "entry milik layer masih aktif" vs "sudah dikonsumsi" (penyebab overshoot
 * ke New Tab / homepage browser).
 */
function installFakeHistory() {
  const back = vi.fn();
  const state: { current: unknown } = { current: null };
  const fake = {
    get state() {
      return state.current;
    },
    get length() {
      return 2;
    },
    pushState: vi.fn((s: unknown) => {
      state.current = s;
    }),
    replaceState: vi.fn((s: unknown) => {
      state.current = s;
    }),
    back,
    forward: vi.fn(),
    go: vi.fn(),
  };
  Object.defineProperty(window, 'history', { value: fake, configurable: true, writable: true });
  return { back, setState: (s: unknown) => (state.current = s) };
}

describe('useBackLayer overshoot guard', () => {
  it('TIDAK memanggil history.back() saat entry layer sudah tidak aktif (cegah keluar ke homepage browser)', async () => {
    const { useBackLayer } = await loadModule();
    const { back, setState } = installFakeHistory();

    const { rerender } = renderHook(({ active }) => useBackLayer(active, () => {}), {
      initialProps: { active: true },
    });

    // Simulasi entry layer sudah dikonsumsi / bukan entry aktif lagi.
    setState({ bn: 'stale' });
    rerender({ active: false });

    expect(back).not.toHaveBeenCalled();
  });

  it('tetap memanggil history.back() sekali saat entry layer memang aktif', async () => {
    const { useBackLayer } = await loadModule();
    const { back, setState } = installFakeHistory();

    const { rerender } = renderHook(({ active }) => useBackLayer(active, () => {}), {
      initialProps: { active: true },
    });
    // Entry aktif = state milik layer yang baru dipush.
    const pushed = (window.history.pushState as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0][0];
    setState(pushed);

    rerender({ active: false });
    expect(back).toHaveBeenCalledTimes(1);
  });
});

describe('useExitGuard', () => {
  it('back pertama memanggil onExit (hint), back kedua tidak menahan lagi', async () => {
    const { useExitGuard } = await loadModule();
    const onExit = vi.fn();

    renderHook(() => useExitGuard(true, onExit));

    pressBack();
    expect(onExit).toHaveBeenCalledTimes(1);

    // Back kedua dalam jendela waktu: dibiarkan lewat (OS menutup app), onExit
    // tidak dipanggil lagi.
    pressBack();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('re-arm setelah jendela waktu lewat, back memanggil onExit lagi', async () => {
    vi.useFakeTimers();
    try {
      const { useExitGuard } = await loadModule();
      const onExit = vi.fn();

      renderHook(() => useExitGuard(true, onExit));

      pressBack();
      expect(onExit).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      pressBack();
      expect(onExit).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
