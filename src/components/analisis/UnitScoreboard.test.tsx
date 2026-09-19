// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UnitScoreboard, ScoreboardRow } from './UnitScoreboard';

describe('UnitScoreboard - Ranking Adil & Keaktifan Entri', () => {
  afterEach(cleanup);

  const sampleData: ScoreboardRow[] = [
    {
      unitId: 'hc-small',
      unitName: 'Puskesmas Kecil (5 Sasaran)',
      numerator: 5,
      denominator: 5,
      participation: 1.0, // 100%
    },
    {
      unitId: 'hc-large',
      unitName: 'Puskesmas Besar Sangat Aktif (1000 Sasaran)',
      numerator: 920,
      denominator: 1000,
      participation: 0.92, // 92%
    },
    {
      unitId: 'hc-medium',
      unitName: 'Puskesmas Sedang (200 Sasaran)',
      numerator: 150,
      denominator: 200,
      participation: 0.75, // 75%
    },
  ];

  it('mengurutkan berdasarkan Skor Kinerja (default) secara adil: unit besar sangat aktif menang atas unit mikro', () => {
    render(<UnitScoreboard data={sampleData} />);

    // Pada Skor Kinerja:
    // Puskesmas Besar: Cakupan = 92, Volume = (920/920)*100 = 100 -> Skor = 46 + 50 = 96.0
    // Puskesmas Kecil: Cakupan = 100, Volume = (5/920)*100 = 0.54 -> Skor = 50 + 0.27 = 50.3
    // Puskesmas Sedang: Cakupan = 75, Volume = (150/920)*100 = 16.3 -> Skor = 37.5 + 8.15 = 45.7

    const buttons = screen.getAllByRole('button');
    const rowButtons = buttons.slice(3);
    expect(rowButtons[0].textContent).toContain('Puskesmas Besar Sangat Aktif');
    expect(rowButtons[0].textContent).toContain('Skor 96');

    expect(rowButtons[1].textContent).toContain('Puskesmas Kecil (5 Sasaran)');
    expect(rowButtons[1].textContent).toContain('Skor 50.3');

    expect(rowButtons[2].textContent).toContain('Puskesmas Sedang (200 Sasaran)');
    expect(rowButtons[2].textContent).toContain('Skor 45.7');
  });

  it('persentase sama tapi volume lebih besar mendapatkan skor lebih tinggi', () => {
    const equalPctData: ScoreboardRow[] = [
      {
        unitId: 'p-small',
        unitName: 'Unit Kecil 50%',
        numerator: 50,
        denominator: 100,
        participation: 0.5,
      },
      {
        unitId: 'p-big',
        unitName: 'Unit Besar 50%',
        numerator: 500,
        denominator: 1000,
        participation: 0.5,
      },
    ];

    render(<UnitScoreboard data={equalPctData} />);
    const buttons = screen.getAllByRole('button').slice(3); // 3 tabs + rows
    expect(buttons[0].textContent).toContain('Unit Besar 50%');
    expect(buttons[1].textContent).toContain('Unit Kecil 50%');
  });

  it('volume sama tapi persentase lebih besar mendapatkan skor lebih tinggi', () => {
    const equalVolData: ScoreboardRow[] = [
      {
        unitId: 'p-complete',
        unitName: 'Unit Lengkap 100%',
        numerator: 100,
        denominator: 100,
        participation: 1.0,
      },
      {
        unitId: 'p-half',
        unitName: 'Unit Setengah 50%',
        numerator: 100,
        denominator: 200,
        participation: 0.5,
      },
    ];

    render(<UnitScoreboard data={equalVolData} />);
    const buttons = screen.getAllByRole('button').slice(3);
    expect(buttons[0].textContent).toContain('Unit Lengkap 100%');
    expect(buttons[1].textContent).toContain('Unit Setengah 50%');
  });

  it('dapat berganti ke mode Paling Aktif (Volume)', () => {
    render(<UnitScoreboard data={sampleData} />);

    const volumeTab = screen.getByRole('button', { name: /Paling Aktif/i });
    fireEvent.click(volumeTab);

    const buttons = screen.getAllByRole('button').slice(3);
    expect(buttons[0].textContent).toContain('Puskesmas Besar Sangat Aktif');
    expect(buttons[1].textContent).toContain('Puskesmas Sedang (200 Sasaran)');
    expect(buttons[2].textContent).toContain('Puskesmas Kecil (5 Sasaran)');
  });

  it('dapat berganti ke mode % Cakupan (Partisipasi Murni)', () => {
    render(<UnitScoreboard data={sampleData} />);

    const cakupanTab = screen.getByRole('button', { name: /% Cakupan/i });
    fireEvent.click(cakupanTab);

    const buttons = screen.getAllByRole('button').slice(3);
    // Di mode murni cakupan %, 100% jadi nomor 1
    expect(buttons[0].textContent).toContain('Puskesmas Kecil (5 Sasaran)');
    expect(buttons[1].textContent).toContain('Puskesmas Besar Sangat Aktif');
    expect(buttons[2].textContent).toContain('Puskesmas Sedang (200 Sasaran)');
  });

  it('menangani unit tanpa data (denominator = 0)', () => {
    const emptyUnit: ScoreboardRow[] = [
      {
        unitId: 'hc-empty',
        unitName: 'Puskesmas Kosong',
        numerator: 0,
        denominator: 0,
        participation: 0,
      },
      ...sampleData,
    ];

    render(<UnitScoreboard data={emptyUnit} />);
    expect(screen.getByText('tanpa data')).toBeDefined();
    expect(screen.getByText('Belum ada sasaran terdaftar')).toBeDefined();
  });

  it('memanggil callback onDrill saat baris diklik', () => {
    const handleDrill = vi.fn();
    render(<UnitScoreboard data={sampleData} onDrill={handleDrill} />);

    const rowButton = screen.getByText('Puskesmas Besar Sangat Aktif (1000 Sasaran)');
    fireEvent.click(rowButton);

    expect(handleDrill).toHaveBeenCalledWith(
      'hc-large',
      'Puskesmas Besar Sangat Aktif (1000 Sasaran)',
    );
  });
});
