import { describe, expect, it } from 'vitest';
import { buildRoster, buildDetails, buildRiskList, type ExportPatient, type ExportMeasurement } from './member-export';

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

describe('kolom ASI Eksklusif (roster)', () => {
  const asiPatients: ExportPatient[] = [
    { id: 'b1', regNumber: 'R1', name: 'Bayi Stop', birthDate: '2025-01-01', gender: 'L', isPregnant: false },
    { id: 'b2', regNumber: 'R2', name: 'Bayi Penuh', birthDate: '2025-01-01', gender: 'P', isPregnant: false },
    { id: 'b3', regNumber: 'R3', name: 'Tanpa Data', birthDate: '2025-01-01', gender: 'L', isPregnant: false },
  ];
  const asiMeasurements: ExportMeasurement[] = [
    { patientId: 'b1', sessionDate: '2025-01-15', ageInMonths: 0, exclusiveBreastfeeding: true },
    { patientId: 'b1', sessionDate: '2025-04-15', ageInMonths: 3, exclusiveBreastfeeding: false },
    { patientId: 'b2', sessionDate: '2025-01-15', ageInMonths: 0, exclusiveBreastfeeding: true },
    { patientId: 'b2', sessionDate: '2025-06-15', ageInMonths: 5, exclusiveBreastfeeding: true },
    { patientId: 'b3', sessionDate: '2025-01-15', ageInMonths: 0 },
  ];
  const rows = buildRoster(asiPatients, asiMeasurements, new Date('2025-07-01T00:00:00'));
  const byName = (n: string) => rows.find((r) => r.Nama === n)!;

  it('berhenti di bulan ke-m', () => {
    expect(byName('Bayi Stop')['ASI Eksklusif']).toBe('Berhenti bulan 3');
  });

  it('ASI eksklusif penuh 6 bulan', () => {
    expect(byName('Bayi Penuh')['ASI Eksklusif']).toBe('Eksklusif 6 bln');
  });

  it('tanpa data ASI → kosong', () => {
    expect(byName('Tanpa Data')['ASI Eksklusif']).toBe('');
  });
});

describe('buildRiskList', () => {
  const riskPatients: ExportPatient[] = [
    { id: 'r1', regNumber: 'R1', name: 'Ani', birthDate: '2020-01-15', gender: 'P', isPregnant: false, address: 'RT 02', unitName: 'Melati' },
    { id: 'r2', regNumber: 'R2', name: 'Budi', birthDate: '2020-01-15', gender: 'L', isPregnant: false, address: 'RT 03', unitName: 'Melati' },
  ];
  const riskMeasurements: ExportMeasurement[] = [
    { patientId: 'r1', sessionDate: '2021-01-10', ageInMonths: 12, tbScreeningStatus: 'TIDAK_BERESIKO' },
    { patientId: 'r1', sessionDate: '2021-03-10', ageInMonths: 14, tbScreeningStatus: 'BERESIKO' },
    { patientId: 'r2', sessionDate: '2021-02-10', ageInMonths: 13, weight: 8, weightFaltering2T: true },
  ];
  const rows = buildRiskList(riskPatients, riskMeasurements);

  it('pakai pengukuran terakhir + sertakan posyandu & alamat', () => {
    const tb = rows.find((r) => r['Jenis Risiko'] === 'Beresiko Tuberkulosis (TB)');
    expect(tb).toBeDefined();
    expect(tb!.Posyandu).toBe('Melati');
    expect(tb!.Alamat).toBe('RT 02');
    expect(tb!.Nama).toBe('Ani');
  });

  it('BB 2T masuk daftar', () => {
    expect(rows.some((r) => r.Nama === 'Budi' && r['Jenis Risiko'] === 'BB 2T (tidak naik 2x)')).toBe(true);
  });

  it('pengukuran lama (bukan terakhir) tidak dipakai', () => {
    // r1 terakhir BERESIKO → hanya 1 baris TB, bukan 2.
    expect(rows.filter((r) => r.Nama === 'Ani')).toHaveLength(1);
  });

  it('2T remaja tidak masuk daftar risiko', () => {
    const remaja: ExportPatient[] = [
      { id: 'r3', regNumber: 'R3', name: 'Citra', birthDate: '2010-01-15', gender: 'P', isPregnant: false },
    ];
    const remajaMeas: ExportMeasurement[] = [
      { patientId: 'r3', sessionDate: '2021-02-10', ageInMonths: 133, weight: 40, weightFaltering2T: true },
    ];
    const remajaRows = buildRiskList(remaja, remajaMeas);
    expect(remajaRows.some((r) => r['Jenis Risiko'] === 'BB 2T (tidak naik 2x)')).toBe(false);
  });
});
