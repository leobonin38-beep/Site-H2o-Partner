import { classify, type HardnessClass } from './hardness';

/** Nombre décimal à la française : 24.5 → « 24,5 ». */
export const fmt = (x: number) => x.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
/** Date ISO → « 10 octobre 2025 ». */
export const fmtDate = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Repères de dureté affichés sur l'échelle (bornes en °f). */
export const ECHELLE: { label: HardnessClass; from: number; to: number }[] = [
  { label: 'très douce', from: 0, to: 7 }, { label: 'douce', from: 7, to: 15 }, { label: 'moyennement dure', from: 15, to: 25 },
  { label: 'dure', from: 25, to: 35 }, { label: 'très dure', from: 35, to: 50 },
];

/** Conseils par niveau de dureté (textes rédigés par Claude, listés dans docs/textes-a-relire.md). */
export const CONSEILS: Record<HardnessClass, string> = {
  'très douce': "Une eau très douce : pas de tartre à craindre. Un adoucisseur n'est en général pas nécessaire.",
  douce: "Une eau douce : peu de tartre. Un adoucisseur n'est en général pas nécessaire ; un filtre peut suffire selon vos besoins.",
  'moyennement dure': "Le tartre commence à se voir : traces sur la robinetterie, dépôts dans la bouilloire et le chauffe-eau. Un adoucisseur protège l'installation, surtout pour l'eau chaude.",
  dure: "Le tartre se dépose vite dans le chauffe-eau, la robinetterie et l'électroménager. Un adoucisseur bien réglé protège l'installation et réduit l'entretien.",
  'très dure': "Une eau très chargée en calcaire : les dépôts sont importants et rapides. Un adoucisseur, dimensionné par un professionnel, est fortement conseillé.",
};
export { classify };
