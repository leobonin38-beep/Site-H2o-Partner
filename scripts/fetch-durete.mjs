// Récupère la dureté (TH, en °f) de l'eau du robinet pour chaque commune d'Isère, à partir des données
// publiques officielles, et l'enregistre dans src/data/durete-isere.json (le site ne fait aucun appel
// extérieur pendant la visite).
//
// Sources (Licence Ouverte Etalab) :
//  - geo.api.gouv.fr : communes, codes postaux, population, coordonnées ;
//  - Hub'Eau, API « qualité de l'eau potable » (contrôle sanitaire des ARS) :
//      communes_udi : quels réseaux (UDI) desservent chaque commune, et les quartiers ;
//      resultats_dis : analyses du paramètre 1345 « titre hydrotimétrique » (TH).
//
// Usage : node scripts/fetch-durete.mjs   (à relancer de temps en temps pour rafraîchir les mesures)
import { writeFileSync, mkdirSync } from 'node:fs';

const DEP = '38';
const SINCE = new Date(Date.now() - 3 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10); // 3 ans
const HUB = 'https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable';
const OUT = new URL('../src/data/durete-isere.json', import.meta.url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok || res.status === 206) return await res.json();
      throw new Error(`${res.status} ${url}`);
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1500 * (i + 1));
    }
  }
}
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const round1 = (x) => Math.round(x * 10) / 10;

// 1. Communes du département
const communes = await getJson(`https://geo.api.gouv.fr/departements/${DEP}/communes?fields=nom,code,codesPostaux,population,centre&format=json`);
console.log('communes', communes.length);

// 2. Réseaux qui desservent chaque commune (année la plus récente disponible)
const year = new Date().getFullYear();
const udi = new Map(); // code commune -> Map(code réseau -> {nom, quartiers:Set})
for (const annee of [year, year - 1, year - 2]) {
  const missing = communes.map((c) => c.code).filter((c) => !udi.has(c));
  if (!missing.length) break;
  for (const group of chunks(missing, 20)) {
    const d = await getJson(`${HUB}/communes_udi?code_commune=${group.join(',')}&annee=${annee}&size=5000`);
    for (const r of d.data ?? []) {
      if (!udi.has(r.code_commune)) udi.set(r.code_commune, new Map());
      const nets = udi.get(r.code_commune);
      if (!nets.has(r.code_reseau)) nets.set(r.code_reseau, { nom: r.nom_reseau, quartiers: new Set() });
      if (r.nom_quartier && r.nom_quartier !== '-') nets.get(r.code_reseau).quartiers.add(r.nom_quartier);
    }
  }
}
console.log('communes avec réseaux', udi.size);

// 3. Analyses de dureté (TH) depuis SINCE, pour toutes les communes du département
const results = [];
for (const group of chunks(communes.map((c) => c.code), 20)) {
  let page = 1;
  for (;;) {
    const d = await getJson(`${HUB}/resultats_dis?code_commune=${group.join(',')}&code_parametre=1345&date_min_prelevement=${SINCE}&size=5000&page=${page}&fields=code_commune,date_prelevement,resultat_numerique,reseaux,nom_distributeur`);
    results.push(...(d.data ?? []));
    if (!d.next) break;
    page++;
  }
}
console.log('analyses TH', results.length);

// 4. Mesures par réseau
const byNet = new Map(); // code réseau -> [{date, th, distributeur}]
for (const r of results) {
  if (typeof r.resultat_numerique !== 'number') continue;
  for (const n of r.reseaux ?? []) {
    if (!byNet.has(n.code)) byNet.set(n.code, []);
    byNet.get(n.code).push({ date: r.date_prelevement.slice(0, 10), th: r.resultat_numerique, dist: r.nom_distributeur });
  }
}
const netSummary = (code) => {
  const m = byNet.get(code);
  if (!m?.length) return null;
  m.sort((a, b) => a.date.localeCompare(b.date));
  const last = m[m.length - 1];
  const cutoff = `${Number(last.date.slice(0, 4)) - 1}${last.date.slice(4)}`; // un an avant la dernière mesure
  const recent = m.filter((x) => x.date >= cutoff);
  return {
    dernier: round1(last.th), date: last.date, mediane: round1(median(recent.map((x) => x.th))), mesures: m.length,
    distributeur: last.dist ?? null, serie: m.slice(-12).map((x) => [x.date, round1(x.th)]),
  };
};

// 5. Synthèse par commune
const out = [];
const usedSlugs = new Set();
for (const c of communes) {
  const nets = [...(udi.get(c.code) ?? new Map()).entries()]
    .map(([code, n]) => ({ code, nom: n.nom, quartiers: [...n.quartiers].slice(0, 6), ...(netSummary(code) ?? {}) }))
    .filter((n) => n.mediane !== undefined)
    .sort((a, b) => b.mesures - a.mesures);
  let slug = slugify(c.nom);
  if (usedSlugs.has(slug)) slug = `${slug}-${c.code}`;
  usedSlugs.add(slug);
  const values = nets.map((n) => n.mediane);
  out.push({
    code: c.code, nom: c.nom, slug, cp: c.codesPostaux ?? [], population: c.population ?? 0,
    lon: c.centre?.coordinates?.[0] ?? null, lat: c.centre?.coordinates?.[1] ?? null,
    th: values.length ? { min: Math.min(...values), max: Math.max(...values), principal: nets[0].mediane, date: nets.map((n) => n.date).sort().pop() } : null,
    reseaux: nets,
  });
}
const withData = out.filter((c) => c.th).length;
mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true });
writeFileSync(OUT, JSON.stringify({
  departement: DEP, depuis: SINCE, genere: new Date().toISOString().slice(0, 10),
  source: "Hub'Eau – qualité de l'eau potable (contrôle sanitaire des ARS) et geo.api.gouv.fr, Licence Ouverte Etalab",
  communes: out,
}) + '\n');
console.log(`écrit : ${out.length} communes, dont ${withData} avec une dureté mesurée`);
