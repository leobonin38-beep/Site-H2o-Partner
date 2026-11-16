/** Classes de dureté (repères courants en degrés français, reprises de la V1/V2). */
export type HardnessClass = 'très douce' | 'douce' | 'moyennement dure' | 'dure' | 'très dure';
const CLASSES: [number, HardnessClass][] = [[7, 'très douce'], [15, 'douce'], [25, 'moyennement dure'], [35, 'dure']];

export function classify(th: number): HardnessClass {
  for (const [max, label] of CLASSES) if (th < max) return label;
  return 'très dure';
}

/** Adoucir de 1 °f apporte en moyenne 4,6 mg de sodium par litre. */
export const SODIUM_PER_DEGREE = 4.6;
export function sodiumAdded(th: number, target: number): number {
  return Math.round(Math.max(0, th - Math.min(target, th)) * SODIUM_PER_DEGREE);
}
