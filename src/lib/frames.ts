/** Image à afficher pour une progression p (0 à 1) : l'image entière et la suivante, avec leur taux de mélange. */
export function frameAt(p: number, count: number): { index: number; next: number; mix: number } {
  const f = Math.min(1, Math.max(0, p)) * (count - 1);
  const index = Math.floor(f);
  const next = Math.min(count - 1, index + 1);
  return { index, next, mix: index === next ? 0 : f - index };
}
