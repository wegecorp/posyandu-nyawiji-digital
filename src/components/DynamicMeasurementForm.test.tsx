// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { AuthProvider } from '@/lib/auth-context';
import { DynamicMeasurementForm } from '@/components/DynamicMeasurementForm';
import type { PatientData } from '@/lib/types';

const patient: PatientData = {
  id: 'p1',
  regNumber: 'POS-WNS-01-2026-0001',
  name: 'Arka Pratama',
  birthDate: '2023-01-01T00:00:00.000Z',
  gender: 'L',
  isPregnant: false,
  posyanduId: 'pos1',
  category: 'BALITA_APRAS',
  ageDisplay: '3 Tahun',
  createdAt: '2023-01-01T00:00:00.000Z',
};

const calls: Array<{ url: string; method: string }> = [];

function fetchMock(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const method = init?.method || 'GET';
  calls.push({ url, method });

  if (method === 'GET' && url.endsWith('/api/auth/me')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          user: { id: 'u1', username: 'kader', name: 'Kader', role: 'POSYANDU', posyanduId: 'pos1', posyanduName: 'Melati' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  }
  if (method === 'GET' && url.includes('/api/patients/p1')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          data: { ...patient, todayMeasurement: null, measurements: [] },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  }
  if (method === 'POST' && url.includes('/api/measurements/autosave')) {
    return Promise.resolve(
      new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );
  }
  return Promise.resolve(new Response(JSON.stringify({ success: false }), { status: 404 }));
}

beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal('fetch', fetchMock);
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  cleanup();
});

describe('DynamicMeasurementForm autosave behavior', () => {
  it('tidak memicu refetch daftar pasien tiap ketik, simpan via autosave saja', async () => {
    render(
      <AuthProvider>
        <DynamicMeasurementForm patient={patient} onBackToList={() => {}} onShowQR={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('0.0').length).toBeGreaterThan(0);
    });

    vi.useFakeTimers();
    const weightInput = screen.getAllByPlaceholderText('0.0')[0];
    fireEvent.change(weightInput, { target: { value: '12' } });
    await vi.advanceTimersByTimeAsync(700);
    fireEvent.change(weightInput, { target: { value: '12.5' } });
    await vi.advanceTimersByTimeAsync(700);

    const listFetches = calls.filter((c) => c.url.includes('/api/patients?'));
    const autosaves = calls.filter((c) => c.url.includes('/api/measurements/autosave'));

    expect(listFetches).toHaveLength(0);
    expect(autosaves.length).toBeGreaterThanOrEqual(1);
  });
});
