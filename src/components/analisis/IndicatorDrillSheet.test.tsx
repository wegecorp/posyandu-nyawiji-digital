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
  const fn = vi.fn(async () => ({
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
  it('menampilkan persentase dan penyebut dinilai secara benar dari payload abnormal/assessed/prevalence (tanpa NaN%)', async () => {
    mockFetch(LEGACY_API_DATA);
    const { IndicatorDrillSheet } = await import('./IndicatorDrillSheet');

    render(
      <IndicatorDrillSheet
        indicator="hypertension"
        label="Hipertensi"
        from="2026-01-01"
        to="2026-03-31"
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Puskesmas Playen I')).toBeDefined();
    });

    expect(screen.getByText('4 / 10 dinilai')).toBeDefined();
    expect(screen.getByText('40%')).toBeDefined();

    expect(screen.getByText('1 / 2 dinilai')).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();
    expect(screen.getByText(/sampel kecil/i)).toBeDefined();

    expect(screen.queryByText(/NaN%/i)).toBeNull();
    expect(screen.queryByText(/undefined/i)).toBeNull();
  });

  it('menampilkan persentase secara benar dari payload dengan count/total/percent', async () => {
    mockFetch(NEW_API_DATA);
    const { IndicatorDrillSheet } = await import('./IndicatorDrillSheet');

    render(
      <IndicatorDrillSheet
        indicator="hypertension"
        label="Hipertensi"
        from="2026-01-01"
        to="2026-03-31"
        onClose={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Puskesmas Playen I')).toBeDefined();
    });

    expect(screen.getByText('4 / 10 dinilai')).toBeDefined();
    expect(screen.getByText('40%')).toBeDefined();
    expect(screen.queryByText(/NaN%/i)).toBeNull();
  });
});
