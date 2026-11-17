// ⚠️ Ancienne séquence (schéma dessiné par le code). Remplacée le 2026-11-17 par la vidéo Veo : voir scripts/veo-sequence.sh. Ne relancer que pour revenir au schéma.
// Rend les deux séquences en PNG, puis les convertit en WebP pour le site.
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('../node_modules/sharp');
const H = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const OUT = new URL('../public/sequences/softener/', import.meta.url).pathname;
const targets = { wide: { q: 60, w: 1600, step: 1 }, tall: { q: 60, w: 720, step: 1 } };
const counts = {};
for (const [layout, { q, w, step }] of Object.entries(targets)) {
  const tmp = `out/png-${layout}`;
  rmSync(tmp, { recursive: true, force: true });
  execSync(`npx remotion render Softener-${layout} ${tmp} --image-format=png --sequence --browser-executable=${H}`, { stdio: 'inherit' });
  const dir = `${OUT}${layout}/`;
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const files = readdirSync(tmp).filter((f) => f.endsWith('.png')).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/))).filter((_, i) => i % step === 0);
  counts[layout] = files.length;
  let bytes = 0;
  for (const [i, f] of files.entries()) {
    const info = await sharp(`${tmp}/${f}`).resize({ width: w }).webp({ quality: q, effort: 5 }).toFile(`${dir}f${String(i).padStart(3, '0')}.webp`);
    bytes += info.size;
  }
  console.log(layout, files.length, 'images', (bytes / 1e6).toFixed(2), 'Mo');
}
writeFileSync(`${OUT}manifest.json`, JSON.stringify({ wide: { count: counts.wide, width: 1600, height: 900 }, tall: { count: counts.tall, width: 720, height: 960 } }) + '\n');
await sharp(`out/png-wide/${readdirSync('out/png-wide').filter((f) => f.endsWith('.png')).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)))[60]}`).webp({ quality: 72 }).toFile(`${OUT}fallback.webp`);
