import { describe, it, expect } from 'vitest';
import { parseQuery, summarize, median } from '../../src/lib/durete-live';

describe('parseQuery', () => {
  it('reconnaît un code postal complet, un début de code, un nom', () => {
    expect(parseQuery('38500')).toEqual({ kind: 'cp', cp: '38500' });
    expect(parseQuery(' 385 ')).toEqual({ kind: 'partial' });
    expect(parseQuery('2A')).toEqual({ kind: 'partial' });
    expect(parseQuery('Voiron')).toEqual({ kind: 'nom', nom: 'Voiron' });
    expect(parseQuery('v')).toBeNull();
  });
});

describe('summarize', () => {
  const udi = [
    { annee: '2026', code_reseau: 'A', nom_reseau: 'RES A', nom_quartier: 'Centre' },
    { annee: '2026', code_reseau: 'B', nom_reseau: 'RES B', nom_quartier: '-' },
    { annee: '2024', code_reseau: 'OLD', nom_reseau: 'ANCIEN', nom_quartier: null },
  ];
  const m = (d: string, v: number | null, codes: string[]) => ({ date_prelevement: `${d}T08:00:00Z`, resultat_numerique: v, code_reseau: codes });

  it('médiane sur un an avant la dernière mesure, réseau principal = le plus analysé', () => {
    const d = summarize(udi, [
      m('2025-12-01', 20, ['A']), m('2025-06-01', 22, ['A']), m('2025-03-01', 30, ['A']),
      m('2024-06-01', 99, ['A']), // plus d'un an avant la dernière mesure : ignorée pour la médiane
      m('2025-10-01', 30, ['B', 'X']), m('2025-11-01', null, ['B']),
    ])!;
    expect(d.reseaux.map((r) => r.code)).toEqual(['A', 'B']);
    expect(d.reseaux[0]).toMatchObject({ mediane: 22, dernier: 20, date: '2025-12-01', mesures: 3, quartiers: ['Centre'] });
    expect(d.reseaux[1].quartiers).toEqual([]);
    expect(d).toMatchObject({ principal: 22, min: 22, max: 30, date: '2025-12-01' });
  });

  it("ne garde que les réseaux de l'année la plus récente ; sans mesure, rien", () => {
    expect(summarize(udi, [m('2025-01-01', 10, ['OLD'])])).toBeNull();
  });

  it('sans réseau connu, regroupe les analyses de la commune par réseau', () => {
    const d = summarize([], [{ date_prelevement: '2025-01-01T00:00:00Z', resultat_numerique: 12.34, code_reseau: ['R'], nom_reseau: ['NOM'] }])!;
    expect(d.reseaux[0]).toMatchObject({ code: 'R', nom: 'NOM', mediane: 12.3 });
  });

  it('median', () => { expect(median([3, 1, 2])).toBe(2); expect(median([1, 2, 3, 4])).toBe(2.5); });
});
