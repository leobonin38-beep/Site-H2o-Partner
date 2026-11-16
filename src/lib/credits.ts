import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type Credit = { file: string; source: string; author: string; licence: string };

/** Crédits des photos réellement utilisées dans src/ (lus dans sources-v2/photos/SOURCES.tsv). */
export function usedPhotoCredits(root = process.cwd()): Credit[] {
  const rows = readFileSync(join(root, 'sources-v2/photos/SOURCES.tsv'), 'utf8').trim().split('\n').slice(1)
    .map((l) => l.split('\t')).map(([file, source, author, , licence]) => ({ file, source, author, licence }));
  const used = new Set<string>();
  const walk = (dir: string) => readdirSync(dir).forEach((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(astro|ts)$/.test(f)) for (const m of readFileSync(p, 'utf8').matchAll(/photos\/([a-z0-9-]+\.jpg)/g)) used.add(m[1]);
  });
  walk(join(root, 'src'));
  return rows.filter((r) => used.has(r.file));
}
