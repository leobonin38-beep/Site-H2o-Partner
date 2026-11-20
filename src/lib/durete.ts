import data from '../data/durete-isere.json';
import { classify, type HardnessClass } from './hardness';
import type { CommuneIndex } from './communes';

export type Reseau = { code: string; nom: string; quartiers: string[]; dernier: number; date: string; mediane: number; mesures: number; distributeur: string | null; serie: [string, number][] };
export type Commune = { code: string; nom: string; slug: string; cp: string[]; population: number; lon: number | null; lat: number | null; th: { min: number; max: number; principal: number; date: string } | null; reseaux: Reseau[] };

export const DURETE = data as { departement: string; depuis: string; genere: string; source: string; communes: Commune[] };
export const COMMUNES = DURETE.communes;
export const COMMUNES_MESUREES = COMMUNES.filter((c) => c.th);

export function toIndex(c: Commune): CommuneIndex {
  return { n: c.nom, cp: c.cp, s: c.slug, p: c.population, th: c.th?.principal ?? null, lo: c.th?.min ?? null, hi: c.th?.max ?? null, x: c.lon, y: c.lat };
}

/** Nombre décimal à la française : 24.5 → « 24,5 ». */
export const fmt = (x: number) => x.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
/** Date ISO → « 10 octobre 2025 ». */
export const fmtDate = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const cpLabel = (c: { cp: string[] }) => c.cp.join(', ');

/** Conseils par niveau de dureté (textes rédigés par Claude, listés dans docs/textes-a-relire.md). */
export const CONSEILS: Record<HardnessClass, string> = {
  'très douce': "Une eau très douce : pas de tartre à craindre. Un adoucisseur n'est en général pas nécessaire.",
  douce: "Une eau douce : peu de tartre. Un adoucisseur n'est en général pas nécessaire ; un filtre peut suffire selon vos besoins.",
  'moyennement dure': "Le tartre commence à se voir : traces sur la robinetterie, dépôts dans la bouilloire et le chauffe-eau. Un adoucisseur protège l'installation, surtout pour l'eau chaude.",
  dure: "Le tartre se dépose vite dans le chauffe-eau, la robinetterie et l'électroménager. Un adoucisseur bien réglé protège l'installation et réduit l'entretien.",
  'très dure': "Une eau très chargée en calcaire : les dépôts sont importants et rapides. Un adoucisseur, dimensionné par un professionnel, est fortement conseillé.",
};
export { classify };
