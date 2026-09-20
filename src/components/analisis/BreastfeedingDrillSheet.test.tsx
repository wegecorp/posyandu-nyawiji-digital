// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { role: 'DINKES' } }),
}));

const ROWS = [
  { ym: '2026-02', unitId: 'hc1', unitName: 'Puskesmas A', assessed: 5, exclusive: 4, percent: 80 },
  { ym: '2026-02', unitId: 'hc2', unitName: 'Puskesmas B', assessed: 4, exclusive: 2, percent: 50 },
  { ym: '2026-01', unitId: 'hc1', unitName: 'Puskesmas A', assessed: 2, exclusive: 1, percent: 50 },
  { ym: '2026-01', unitId: 'hc2', unitName: 'Puskesmas B', assessed: 3, exclusive: 3, percent: 100 },
];

function mockFetch() {
  const fn = vi.fn(async (url: string) => {
    const from = /from=(\d{4}-\d{2})/.exec(String(url))?.[1] ?? '';
    const to = /to=(\d{4}-\d{2})/.exec(String(url))?.[1] ?? '9999-99';
    const data = ROWS.filter((r) => r.ym >= from && r.ym <= to);
    return { json: async () => ({ success: true, scope: 'puskesmas', data }) };
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

async function renderSheet() {
  const { BreastfeedingDrillSheet } = await import('./BreastfeedingDrillSheet');
  return render(
    <BreastfeedingDrillSheet
      months={['2026-01', '2026-02']}
      initialYm="2026-02"
      onClose={() => {}}
    />,
  );
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BreastfeedingDrillSheet', () => {
  it('tampilkan tiap unit sekali (bukan sekali per bulan)', async () => {
    mockFetch();
    await renderSheet();

    await waitFor(() => expect(screen.getAllByText('Puskesmas A')).toHaveLength(1));
    expect(screen.getAllByText('Puskesmas B')).toHaveLength(1);
    expect(screen.getByText('80% dari sasaran dinilai')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('/ 5')).toBeTruthy();
  });

  it('ambil rentang bulan terpilih, bukan seluruh periode', async () => {
    const fetchFn = mockFetch();
    await renderSheet();

    await waitFor(() => expect(fetchFn).toHaveBeenCalled());
    const first = String(fetchFn.mock.calls[0][0]);
    expect(first).toContain('from=2026-02-01');
    expect(first).toContain('to=2026-02-28');
  });

  it('ganti bulan lewat pemilih bulan → fetch ulang bulan itu', async () => {
    const fetchFn = mockFetch();
    await renderSheet();
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByTestId('breastfeeding-month'), { target: { value: '2026-01' } });

    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
    const url = String(fetchFn.mock.calls[1][0]);
    expect(url).toContain('from=2026-01-01');
    expect(url).toContain('to=2026-01-31');
  });
});
