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

describe('useExitGuard', () => {
  it('memanggil onExit dan tetap hidup saat back di layar root', async () => {
    const { useExitGuard } = await loadModule();
    const onExit = vi.fn();

    renderHook(() => useExitGuard(true, onExit));
    pressBack();

    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
