import { test, expect } from '@playwright/test';

export const PAGES = [
  'particuliers/', 'particuliers/adoucisseur-privilege/', 'particuliers/pourquoi-un-adoucisseur/', 'particuliers/verite-sur-adoucisseur/',
  'installateurs/', 'collectif-tertiaire/', 'collectif-tertiaire/materiel-clack/', 'collectif-tertiaire/desembouage/',
  'collectif-tertiaire/desinfection-reseaux/', 'industrie/', 'entretien-sav/', 'entreprise/', 'diagnostic/', 'contact/',
];

test('chaque page : titre, description, h1, fil d’Ariane, données structurées, pas en construction', async ({ page }) => {
  const titles = new Set<string>(); const descs = new Set<string>();
  for (const p of PAGES) {
    await page.goto(p);
    const title = await page.title();
    expect(title.length, p).toBeLessThanOrEqual(60);
    expect(titles.has(title), `titre en double : ${p}`).toBe(false); titles.add(title);
    const d = (await page.locator('meta[name="description"]').getAttribute('content'))!;
    expect(d.length, p).toBeGreaterThanOrEqual(50); expect(d.length, p).toBeLessThanOrEqual(160);
    expect(descs.has(d), `description en double : ${p}`).toBe(false); descs.add(d);
    await expect(page.locator('h1'), p).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Fil d\'Ariane"]'), p).toBeVisible();
    const lds = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((s) => JSON.parse(s));
    expect(lds.some((o) => o['@type'] === 'BreadcrumbList'), p).toBe(true);
    expect(await page.locator('main').innerText(), p).not.toMatch(/en construction|arrive bientôt/i);
    expect(await page.locator('main').innerText(), p).not.toMatch(/\/5\b|étoiles|avis clients/i);
  }
});

test('chaque page : pas de débordement à 360 px ni d’erreur', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 360, height: 760 });
  for (const p of PAGES) {
    await page.goto(p, { waitUntil: 'networkidle' });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over, p).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
});
