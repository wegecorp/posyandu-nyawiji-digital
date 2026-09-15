import { describe, it, expect } from 'vitest';
import { deriveKapanewon, normPuskesmasName } from './names';

const KAPANEWON = [
  { id: 'wns', name: 'Wonosari' },
  { id: 'ngl', name: 'Nglipar' },
  { id: 'smn', name: 'Semin' },
  { id: 'smu', name: 'Semanu' },
  { id: 'pws', name: 'Purwosari' },
  { id: 'sps', name: 'Saptosari' },
  { id: 'tjs', name: 'Tanjungsari' },
  { id: 'ply', name: 'Playen' },
  { id: 'pya', name: 'Paliyan' },
];

describe('normPuskesmasName', () => {
  it('buang kata PUSKESMAS & non-alfanumerik', () => {
    expect(normPuskesmasName('Puskesmas Wonosari I')).toBe('WONOSARII');
    expect(normPuskesmasName('NGLIPAR I')).toBe('NGLIPARI');
  });
});

describe('deriveKapanewon', () => {
  it('prefix match dengan angka romawi', () => {
    expect(deriveKapanewon('NGLIPAR I', KAPANEWON)?.id).toBe('ngl');
    expect(deriveKapanewon('NGLIPAR II', KAPANEWON)?.id).toBe('ngl');
    expect(deriveKapanewon('PUSKESMAS WONOSARI II', KAPANEWON)?.id).toBe('wns');
    expect(deriveKapanewon('SEMANU I', KAPANEWON)?.id).toBe('smu');
  });

  it('tak tertukar antar kapanewon mirip (Semin vs Semanu)', () => {
    expect(deriveKapanewon('SEMIN I', KAPANEWON)?.id).toBe('smn');
    expect(deriveKapanewon('SEMANU II', KAPANEWON)?.id).toBe('smu');
  });

  it('ambil prefix terpanjang (Saptosari/Tanjungsari/Purwosari)', () => {
    expect(deriveKapanewon('SAPTOSARI', KAPANEWON)?.id).toBe('sps');
    expect(deriveKapanewon('TANJUNGSARI', KAPANEWON)?.id).toBe('tjs');
    expect(deriveKapanewon('PURWOSARI', KAPANEWON)?.id).toBe('pws');
  });

  it('null bila tak ada yang cocok', () => {
    expect(deriveKapanewon('PUSKESMAS ANTARTIKA', KAPANEWON)).toBeNull();
  });
});
