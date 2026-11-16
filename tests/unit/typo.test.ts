import { describe, it, expect } from 'vitest';
import { fr } from '../../src/lib/typo';
const NB = ' ';
describe('fr (typographie française)', () => {
  it('insère une espace insécable avant : ; ? !', () => {
    expect(fr('cher : vos')).toBe(`cher${NB}: vos`);
    expect(fr('Pourquoi adoucir ?')).toBe(`Pourquoi adoucir${NB}?`);
  });
  it('dans les guillemets français', () => {
    expect(fr('« dure »')).toBe(`«${NB}dure${NB}»`);
  });
  it('laisse les adresses et heures tranquilles', () => {
    expect(fr('https://exemple.fr')).toBe('https://exemple.fr');
  });
});
