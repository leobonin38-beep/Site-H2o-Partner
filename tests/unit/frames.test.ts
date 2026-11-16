import { describe, it, expect } from 'vitest';
import { frameAt } from '../../src/lib/frames';

describe('frameAt (fondu entre deux images voisines)', () => {
  it('donne la première image au début et la dernière à la fin', () => {
    expect(frameAt(0, 120)).toEqual({ index: 0, next: 1, mix: 0 });
    expect(frameAt(1, 120)).toEqual({ index: 119, next: 119, mix: 0 });
  });
  it('mélange les deux images voisines entre deux positions', () => {
    const f = frameAt(10.25 / 119, 120);
    expect(f.index).toBe(10);
    expect(f.next).toBe(11);
    expect(f.mix).toBeCloseTo(0.25, 5);
  });
  it('borne les valeurs hors de [0, 1]', () => {
    expect(frameAt(-0.2, 60).index).toBe(0);
    expect(frameAt(1.4, 60).index).toBe(59);
  });
});
