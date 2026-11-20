import { describe, it, expect } from 'vitest';
import { normalize, searchCommunes, nearest, type CommuneIndex } from '../../src/lib/communes';

const idx: CommuneIndex[] = [
  { n: 'Voiron', cp: ['38500'], s: 'voiron', p: 21847, th: 24.5, lo: 21.2, hi: 26.7, x: 5.587, y: 45.38 },
  { n: 'Voreppe', cp: ['38340'], s: 'voreppe', p: 9500, th: 20, lo: 20, hi: 20, x: 5.637, y: 45.294 },
  { n: 'Saint-Étienne-de-Saint-Geoirs', cp: ['38590'], s: 'saint-etienne-de-saint-geoirs', p: 3400, th: 22, lo: 22, hi: 22, x: 5.34, y: 45.34 },
  { n: 'Sillans', cp: ['38590'], s: 'sillans', p: 1919, th: 23.9, lo: 23.9, hi: 23.9, x: 5.392, y: 45.347 },
  { n: 'Assieu', cp: ['38150'], s: 'assieu', p: 1500, th: null, lo: null, hi: null, x: 4.87, y: 45.41 },
];

describe('normalize', () => {
  it('retire accents, majuscules et ponctuation', () => {
    expect(normalize('Saint-Étienne-de-Saint-Geoirs')).toBe('saint etienne de saint geoirs');
    expect(normalize("  L'Albenc ")).toBe('l albenc');
  });
});

describe('searchCommunes', () => {
  it('trouve par début de nom, sans accents, les plus peuplées d’abord', () => {
    expect(searchCommunes(idx, 'vo').map((c) => c.n)).toEqual(['Voiron', 'Voreppe']);
  });
  it('trouve par mot du nom', () => {
    expect(searchCommunes(idx, 'etienne').map((c) => c.n)).toEqual(['Saint-Étienne-de-Saint-Geoirs']);
  });
  it('trouve par code postal', () => {
    expect(searchCommunes(idx, '38590').map((c) => c.n)).toEqual(['Saint-Étienne-de-Saint-Geoirs', 'Sillans']);
  });
  it('rien pour une saisie vide ou d’un seul caractère', () => {
    expect(searchCommunes(idx, '')).toEqual([]);
    expect(searchCommunes(idx, 'v')).toEqual([]);
  });
});

describe('nearest', () => {
  it('donne les communes voisines avec une mesure, la plus proche d’abord, sans la commune elle-même', () => {
    expect(nearest(idx, idx[3], 2).map((c) => c.n)).toEqual(['Saint-Étienne-de-Saint-Geoirs', 'Voiron']);
  });
});
