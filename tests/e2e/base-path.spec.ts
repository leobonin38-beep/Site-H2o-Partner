import { test, expect } from '@playwright/test';

// Vérifie que chaque ressource interne de chaque page construite répond 200,
// y compris quand le site est servi sous un sous-dossier (BASE_PATH).
test('aucun fichier interne cassé', async ({ page, request, baseURL }) => {
  test.setTimeout(180_000); // parcourt tout le site
  const origin = new URL(baseURL!).origin;
  const toVisit = ['./'];
  const seen = new Set<string>();
  const broken: string[] = [];
  while (toVisit.length) {
    const p = toVisit.shift()!;
    const res = await page.goto(p);
    if (!res || res.status() !== 200) { broken.push(`page ${p} -> ${res?.status()}`); continue; }
    const refs = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('a[href]').forEach((a) => out.push('a:' + (a as HTMLAnchorElement).href));
      document.querySelectorAll('img[src],script[src],source[src],video[poster]').forEach((e) => {
        const el = e as any; out.push('r:' + (el.src || new URL(el.getAttribute('poster'), location.href).href));
      });
      document.querySelectorAll('img[srcset],source[srcset]').forEach((e) =>
        (e.getAttribute('srcset') || '').split(',').forEach((s) => out.push('r:' + new URL(s.trim().split(' ')[0], location.href).href)));
      document.querySelectorAll('[data-src-small],[data-src-large]').forEach((e) => ['srcSmall', 'srcLarge'].forEach((k) => (e as HTMLElement).dataset[k] && out.push('r:' + new URL((e as HTMLElement).dataset[k]!, location.href).href)));
      document.querySelectorAll('[data-sequence]').forEach((e) => out.push('r:' + new URL((e as HTMLElement).dataset.src + 'manifest.json', location.href).href, 'r:' + new URL((e as HTMLElement).dataset.src + 'wide/f000.webp', location.href).href, 'r:' + new URL((e as HTMLElement).dataset.src + 'tall/f000.webp', location.href).href));
      document.querySelectorAll('link[href]').forEach((l) => { const h = (l as HTMLLinkElement); if (h.rel !== 'canonical' && h.rel !== 'preconnect') out.push('r:' + h.href); });
      return out;
    });
    for (const r of refs) {
      const [kind, u] = [r.slice(0, 1), r.slice(2)];
      if (!u.startsWith(origin) || seen.has(u.split('#')[0])) continue;
      const clean = u.split('#')[0];
      seen.add(clean);
      const st = (await request.get(clean)).status();
      if (st !== 200) broken.push(`${clean} (${st}) sur ${p}`);
      else if (kind === 'a' && clean.endsWith('/')) toVisit.push(clean);
    }
  }
  expect(broken).toEqual([]);
});
