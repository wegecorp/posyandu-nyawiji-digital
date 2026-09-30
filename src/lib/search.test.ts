import { describe, it, expect } from 'vitest';
import { extractSearchTokens, matchToken, matchSearchQuery } from './search';

describe('search helper', () => {
  it('extractSearchTokens membuang stopword jika ada kata lain', () => {
    expect(extractSearchTokens('posyandu melati')).toEqual(['melati']);
    expect(extractSearchTokens('pos melati 1')).toEqual(['melati', '1']);
    expect(extractSearchTokens('puskesmas wonosari i')).toEqual(['wonosari', 'i']);
  });

  it('extractSearchTokens mempertahankan kata jika hanya ada stopword', () => {
    expect(extractSearchTokens('posyandu')).toEqual(['posyandu']);
    expect(extractSearchTokens('puskesmas')).toEqual(['puskesmas']);
  });

  it('matchToken mencocokkan angka arab ke romawi dan sebaliknya', () => {
    expect(matchToken('posyandu melati i', '1')).toBe(true);
    expect(matchToken('posyandu melati 1', 'i')).toBe(true);
    expect(matchToken('posyandu mawar 02', '2')).toBe(true);
    expect(matchToken('posyandu mawar 2', 'ii')).toBe(true);
    expect(matchToken('posyandu mawar iii', '3')).toBe(true);
  });

  it('matchSearchQuery mencocokkan multi-token terpisah', () => {
    const text = 'posyandu melati ii padukuhan wareng kalurahan baleharjo puskesmas wonosari i';
    expect(matchSearchQuery(text, 'melati 2')).toBe(true);
    expect(matchSearchQuery(text, 'wareng wonosari')).toBe(true);
    expect(matchSearchQuery(text, 'posyandu melati baleharjo')).toBe(true);
    expect(matchSearchQuery(text, 'anggrek')).toBe(false);
  });
});
