import { describe, it, expect } from 'vitest';
import { classify, sodiumAdded } from '../../src/lib/hardness';

describe('classify (dureté en °f)', () => {
  it('suit les seuils 7 / 15 / 25 / 35', () => {
    expect(classify(0)).toBe('très douce');
    expect(classify(6.9)).toBe('très douce');
    expect(classify(7)).toBe('douce');
    expect(classify(15)).toBe('moyennement dure');
    expect(classify(25)).toBe('dure');
    expect(classify(35)).toBe('très dure');
    expect(classify(60)).toBe('très dure');
  });
});

describe('sodiumAdded (4,6 mg/L par °f adouci)', () => {
  it('calcule le sodium apporté', () => {
    expect(sodiumAdded(28, 10)).toBe(83);
    expect(sodiumAdded(40, 15)).toBe(115);
  });
  it('vaut 0 quand la cible dépasse la dureté', () => {
    expect(sodiumAdded(10, 28)).toBe(0);
  });
});
