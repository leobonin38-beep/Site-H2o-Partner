/** Index léger d'une commune, servi au navigateur pour la recherche (src/pages/data/durete-index.json.ts). */
export type CommuneIndex = {
  n: string; cp: string[]; s: string; p: number;
  th: number | null; lo: number | null; hi: number | null; // dureté principale, minimum, maximum (°f)
  x: number | null; y: number | null; // longitude, latitude
};

/** Minuscules, sans accents ni ponctuation : « Saint-Étienne » → « saint etienne ». */
export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Recherche par début de nom, début d'un mot du nom ou code postal ; les plus peuplées d'abord. */
export function searchCommunes(index: CommuneIndex[], query: string, limit = 8): CommuneIndex[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const scored: [number, CommuneIndex][] = [];
  for (const c of index) {
    const name = normalize(c.n);
    let score = -1;
    if (/^\d+$/.test(q)) { if (c.cp.some((cp) => cp.startsWith(q))) score = 2; }
    else if (name === q) score = 4;
    else if (name.startsWith(q)) score = 3;
    else if (name.split(' ').some((w) => w.startsWith(q))) score = 2;
    else if (name.includes(q)) score = 1;
    if (score >= 0) scored.push([score, c]);
  }
  return scored.sort((a, b) => b[0] - a[0] || b[1].p - a[1].p).slice(0, limit).map(([, c]) => c);
}

/** Distance approximative en km entre deux points (longitude, latitude). */
function km(a: CommuneIndex, b: CommuneIndex): number {
  const rad = Math.PI / 180;
  const dx = (b.x! - a.x!) * Math.cos(((a.y! + b.y!) / 2) * rad);
  const dy = b.y! - a.y!;
  return Math.hypot(dx, dy) * 111.32;
}

/** Les n communes les plus proches qui ont une dureté mesurée. */
export function nearest(index: CommuneIndex[], from: CommuneIndex, n = 6): CommuneIndex[] {
  if (from.x == null || from.y == null) return [];
  return index
    .filter((c) => c.s !== from.s && c.th != null && c.x != null && c.y != null)
    .map((c) => [km(from, c), c] as const)
    .sort((a, b) => a[0] - b[0])
    .slice(0, n)
    .map(([, c]) => c);
}
