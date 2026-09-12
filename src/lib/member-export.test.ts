import { describe, expect, it } from 'vitest';
import { buildRoster, buildDetails, type ExportPatient, type ExportMeasurement } from './member-export';

const patients: ExportPatient[] = [
  { id: 'p1', regNumber: 'POS-01-2026-0001', name: 'Budi', birthDate: '2020-01-15', gender: 'L', isPregnant: false },
  { id: 'p2', regNumber: 'POS-01-2026-0002', name: 'Ana', birthDate: '2022-06-01', gender: 'P', isPregnant: false },
];

const measurements: ExportMeasurement[] = [
  {
    patientId: 'p1',
    sessionDate: '2021-01-15',
    ageInMonths: 12,
    weight: 9,
    height: 75,
    weightStatus: 'NAIK',
  },
  {
    patientId: 'p1',
    sessionDate: '2021-03-15',
    ageInMonths: 14,
    weight: 9.5,
    height: 78,
    weightStatus: 'TIDAK_NAIK',
    weightFaltering2T: true,
    notes: 'rujuk',
  },
];

describe('buildRoster', () => {
  const rows = buildRoster(patients, measurements, new Date('2023-06-01T00:00:00'));

  it('urut nama & memakai pengukuran terakhir dalam periode', () => {
    expect(rows.map((r) => r.Nama)).toEqual(['Ana', 'Budi']);
    expect(rows[1]['BB (kg)']).toBe(9.5);
    expect(rows[1].Catatan).toBe('rujuk');
  });

  it('anggota tanpa pengukuran tetap muncul, kolom kondisi kosong', () => {
    expect(rows[0]['Tgl Ukur Terakhir']).toBe('');
    expect(rows[0]['BB (kg)']).toBe('');
    expect(rows[0].Umur).toBe('1 Tahun');
  });

  it('memetakan status berat & 2T', () => {
    expect(rows[1]['Berat Naik/Tidak']).toBe('T');
    expect(rows[1]['2T (rujuk)']).toBe('Ya');
  });
});

describe('buildDetails', () => {
  const rows = buildDetails(patients, measurements);

  it('1 baris per kunjungan, urut nama lalu tanggal', () => {
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.Tanggal)).toEqual(['15 Januari 2021', '15 Maret 2021']);
    expect(rows.every((r) => r.NoReg === 'POS-01-2026-0001')).toBe(true);
  });

  it('membawa seluruh field pengukuran', () => {
    expect(rows[1]['Z BB/U']).toBe('');
    expect(rows[1]['Berat Naik/Tidak']).toBe('T');
  });
});
