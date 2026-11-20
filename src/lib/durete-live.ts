// Dureté de l'eau du robinet pour toute commune de France, interrogée au moment de la recherche :
// - communes : geo.api.gouv.fr (nom ou code postal) ;
// - réseaux d'eau de la commune et analyses du TH : Hub'Eau, API « qualité de l'eau potable » (contrôle sanitaire ARS).
// Aucune donnée n'est stockée ; aucun cookie.

export type CommuneGeo = { nom: string; code: string; cp: string[]; dep: string; depNom: string };
export type ReseauTh = { code: string; nom: string; quartiers: string[]; dernier: number; date: string; mediane: number; mesures: number };
export type DureteCommune = { reseaux: ReseauTh[]; principal: number; min: number; max: number; date: string };

type UdiRow = { annee: string; code_reseau: string; nom_reseau: string; nom_quartier?: string | null };
type Mesure = { date_prelevement: string; resultat_numerique: number | null; code_reseau?: string[] | null; nom_reseau?: string[] | null };

const GEO = 'https://geo.api.gouv.fr/communes';
const HUBEAU = 'https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable';
const TH = '1345';

/** Ce que l'utilisateur a tapé : un code postal complet, un début de code postal, un nom, ou rien d'exploitable. */
export function parseQuery(q: string): { kind: 'cp'; cp: string } | { kind: 'nom'; nom: string } | { kind: 'partial' } | null {
  const t = q.trim();
  if (/^\d{5}$/.test(t)) return { kind: 'cp', cp: t };
  if (/^\d[\dAB]{0,4}$/i.test(t)) return { kind: 'partial' };
  return t.length >= 2 ? { kind: 'nom', nom: t } : null;
}

const round1 = (x: number) => Math.round(x * 10) / 10;
export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Résumé par réseau : dernière mesure, et médiane des analyses de l'année qui précède la dernière mesure.
 * La commune prend la valeur de son réseau principal (le plus analysé) et l'écart entre réseaux.
 */
export function summarize(udi: UdiRow[], mesures: Mesure[]): DureteCommune | null {
  const year = udi.reduce((y, r) => (r.annee > y ? r.annee : y), '');
  const nets = new Map<string, { nom: string; quartiers: Set<string>; m: { date: string; th: number }[] }>();
  for (const r of udi.filter((r) => r.annee === year)) {
    const n = nets.get(r.code_reseau) ?? { nom: r.nom_reseau, quartiers: new Set<string>(), m: [] };
    if (r.nom_quartier && r.nom_quartier.trim() && r.nom_quartier.trim() !== '-') n.quartiers.add(r.nom_quartier.trim());
    nets.set(r.code_reseau, n);
  }
  for (const x of mesures) {
    if (x.resultat_numerique == null || !Number.isFinite(x.resultat_numerique)) continue;
    const m = { date: x.date_prelevement.slice(0, 10), th: x.resultat_numerique };
    const codes = [...new Set(x.code_reseau ?? [])].filter((c) => nets.has(c));
    if (codes.length) codes.forEach((c) => nets.get(c)!.m.push(m));
    else if (!udi.length) {
      // Pas de réseau connu (recherche directe par commune) : on regroupe par nom de réseau.
      const nom = x.nom_reseau?.[0] ?? 'Réseau de la commune';
      const key = x.code_reseau?.[0] ?? nom;
      const n = nets.get(key) ?? { nom, quartiers: new Set<string>(), m: [] };
      n.m.push(m); nets.set(key, n);
    }
  }
  const reseaux: ReseauTh[] = [];
  for (const [code, n] of nets) {
    if (!n.m.length) continue;
    n.m.sort((a, b) => a.date.localeCompare(b.date));
    const last = n.m[n.m.length - 1];
    const from = new Date(Date.parse(last.date) - 365 * 864e5).toISOString().slice(0, 10);
    const recent = n.m.filter((x) => x.date > from);
    reseaux.push({ code, nom: n.nom, quartiers: [...n.quartiers], dernier: round1(last.th), date: last.date, mediane: round1(median(recent.map((x) => x.th))), mesures: recent.length });
  }
  if (!reseaux.length) return null;
  reseaux.sort((a, b) => b.mesures - a.mesures || b.date.localeCompare(a.date));
  const vals = reseaux.map((r) => r.mediane);
  return { reseaux, principal: reseaux[0].mediane, min: Math.min(...vals), max: Math.max(...vals), date: reseaux.map((r) => r.date).sort().pop()! };
}

async function getJson<T>(u: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(u, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

type GeoRow = { nom: string; code: string; codesPostaux?: string[]; population?: number; departement?: { code: string; nom: string } };
const toGeo = (c: GeoRow): CommuneGeo => ({ nom: c.nom, code: c.code, cp: c.codesPostaux ?? [], dep: c.departement?.code ?? '', depNom: c.departement?.nom ?? '' });
const FIELDS = 'fields=nom,code,codesPostaux,population,departement';

/** Communes correspondant à un nom ou à un code postal (France entière). */
export async function findCommunes(q: string, signal?: AbortSignal, limit = 8): Promise<CommuneGeo[]> {
  const p = parseQuery(q);
  if (!p || p.kind === 'partial') return [];
  const u = p.kind === 'cp'
    ? `${GEO}?codePostal=${p.cp}&${FIELDS}`
    : `${GEO}?nom=${encodeURIComponent(p.nom)}&${FIELDS}&boost=population&limit=${limit}`;
  const rows = await getJson<GeoRow[]>(u, signal);
  if (p.kind === 'cp') rows.sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
  return rows.map(toGeo).map((c) => (p.kind === 'cp' ? { ...c, cp: [p.cp, ...c.cp.filter((x) => x !== p.cp)] } : c)).slice(0, limit);
}

/** Une commune par son code INSEE (pour une adresse partagée ?code=38563). */
export async function getCommune(code: string, signal?: AbortSignal): Promise<CommuneGeo | null> {
  if (!/^[\dAB]{5}$/i.test(code)) return null;
  try { return toGeo(await getJson<GeoRow>(`${GEO}/${code}?${FIELDS}`, signal)); } catch { return null; }
}

/** Dureté de l'eau d'une commune, d'après les analyses des trois dernières années. */
export async function fetchDurete(code: string, signal?: AbortSignal, today = new Date()): Promise<DureteCommune | null> {
  const since = new Date(today.getTime() - 3 * 365 * 864e5).toISOString().slice(0, 10);
  const udi = (await getJson<{ data: UdiRow[] }>(`${HUBEAU}/communes_udi?code_commune=${code}&size=500&fields=annee,code_reseau,nom_reseau,nom_quartier`, signal)).data;
  const year = udi.reduce((y, r) => (r.annee > y ? r.annee : y), '');
  const codes = [...new Set(udi.filter((r) => r.annee === year).map((r) => r.code_reseau))];
  const fields = 'fields=date_prelevement,resultat_numerique,code_reseau,nom_reseau';
  let mesures: Mesure[] = [];
  // Les listes de codes sont limitées à 20 par requête.
  for (let i = 0; i < codes.length; i += 20) {
    const chunk = codes.slice(i, i + 20).join(',');
    mesures = mesures.concat((await getJson<{ data: Mesure[] }>(`${HUBEAU}/resultats_dis?code_reseau=${chunk}&code_parametre=${TH}&date_min_prelevement=${since}&size=5000&${fields}`, signal)).data);
  }
  let out = codes.length ? summarize(udi, mesures) : null;
  if (!out) {
    // Repli : analyses rattachées directement à la commune.
    mesures = (await getJson<{ data: Mesure[] }>(`${HUBEAU}/resultats_dis?code_commune=${code}&code_parametre=${TH}&date_min_prelevement=${since}&size=5000&${fields}`, signal)).data;
    out = summarize([], mesures);
  }
  return out;
}
