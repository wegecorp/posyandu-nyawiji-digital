// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

let currentRole = 'DINKES';

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { role: currentRole } }),
}));

const LEGACY_API_DATA = [
  {
    unitId: 'hc-1',
    unitName: 'Puskesmas Playen I',
    abnormal: 4,
    assessed: 10,
    prevalence: 0.4,
    smallSample: false,
  },
  {
    unitId: 'hc-2',
    unitName: 'Puskesmas Wonosari I',
    abnormal: 1,
    assessed: 2,
    prevalence: 0.5,
    smallSample: true,
  },
];

const NEW_API_DATA = [
  {
    unitId: 'hc-1',
    unitName: 'Puskesmas Playen I',
    count: 4,
    total: 10,
    percent: 0.4,
    abnormal: 4,
    assessed: 10,
    prevalence: 0.4,
    smallSample: false,
  },
];

function mockFetch(data: unknown) {
  const fn = vi.fn(async (_url?: string | URL | Request) => ({
    ok: true,
    json: async () => ({ success: true, scope: 'puskesmas', data }),
  }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  vi.resetModules();
  currentRole = 'DINKES';
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('IndicatorDrillSheet & UnitDrillList', () => {
  it('menampilkan rasio angka merah X / Y dan persentase secara benar dari payload abnormal/assessed/prevalence (tanpa NaN%)', async () => {
    mockFetch(LEGACY_API_DATA);
    const { IndicatorDrillSheet } = await import('./IndicatorDrillSheet');

    render(
      <IndicatorDrillSheet
        indicator="hypertension"
        label="Hipertensi"
        month="2026-03"
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Puskesmas Playen I')).toBeDefined();
    });

    expect(screen.getByText('40% dari sasaran dinilai')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('/ 10')).toBeDefined();

    expect(screen.getByText('50% dari sasaran dinilai')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('/ 2')).toBeDefined();
    expect(screen.getByText(/sampel kecil/i)).toBeDefined();

    expect(screen.queryByText(/NaN%/i)).toBeNull();
    expect(screen.queryByText(/undefined/i)).toBeNull();
  });

  it('menggunakan rentang tanggal bulan aktif saat prop month diberikan', async () => {
    const fetchFn = mockFetch(NEW_API_DATA);
    const { IndicatorDrillSheet } = await import('./IndicatorDrillSheet');

    render(
      <IndicatorDrillSheet
        indicator="hypertension"
        label="Hipertensi"
        month="2026-03"
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalled();
    });

    const requestedUrl = String(fetchFn.mock.calls[0][0]);
    expect(requestedUrl).toContain('from=2026-03-01');
    expect(requestedUrl).toContain('to=2026-03-31');
    expect(screen.getByText(/Bulan Mar 2026/i)).toBeDefined();
  });
});
