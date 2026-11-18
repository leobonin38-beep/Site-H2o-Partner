import { test, expect } from '@playwright/test';

const FRAMES = /\/sequences\/softener\/(wide|tall)\/f\d+\.webp/;

test('les images de la séquence ne se chargent qu’à l’approche', async ({ page }) => {
  const hits: string[] = [];
  page.on('request', (r) => { if (FRAMES.test(r.url())) hits.push(r.url()); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./', { waitUntil: 'networkidle' });
  expect(hits).toEqual([]);
  await page.locator('#adoucissement').scrollIntoViewIfNeeded();
  await expect.poll(() => hits.length, { timeout: 8000 }).toBeGreaterThan(10);
});

test('au défilement, le canvas s’affiche et les étapes s’allument', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  const sec = page.locator('#adoucissement');
  await sec.scrollIntoViewIfNeeded();
  await expect(page.locator('html')).toHaveClass(/seq-live/, { timeout: 8000 });
  await expect(page.locator('[data-seq-canvas]')).toBeVisible();
  // fin de la section épinglée : la 4e étape est allumée
  const box = await page.evaluate(() => {
    const s = document.querySelector('#adoucissement') as HTMLElement;
    return { top: s.getBoundingClientRect().top + window.scrollY, h: s.offsetHeight };
  });
  await page.evaluate((y) => window.scrollTo(0, y), box.top + box.h - 900 - 10);
  await expect(page.locator('[data-seq-step="3"]')).toHaveClass(/on/, { timeout: 5000 });
});

test('mouvement réduit : image fixe, étapes visibles, aucune image de séquence', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const hits: string[] = [];
  page.on('request', (r) => { if (FRAMES.test(r.url())) hits.push(r.url()); });
  await page.goto(new URL('./', test.info().project.use.baseURL!).href);
  await page.locator('#adoucissement').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-seq-fallback]')).toBeVisible();
  for (let i = 0; i < 4; i++) await expect(page.locator(`[data-seq-step="${i}"]`)).toBeVisible();
  expect(hits).toEqual([]);
  await ctx.close();
});

test('si le manifeste manque, la section reste lisible', async ({ page }) => {
  await page.route('**/sequences/softener/manifest.json', (r) => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await page.locator('#adoucissement').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-seq-fallback]')).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await expect(page.locator(`[data-seq-step="${i}"]`)).toBeVisible();
    expect(Number(await page.locator(`[data-seq-step="${i}"]`).evaluate((e) => getComputedStyle(e).opacity))).toBe(1);
  }
});

test('les déclencheurs sous la section épinglée tiennent compte de l’épinglage (le compteur compte à l’écran)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./', { waitUntil: 'networkidle' });
  await page.locator('#adoucissement').scrollIntoViewIfNeeded();
  await expect(page.locator('html')).toHaveClass(/seq-live/, { timeout: 8000 });
  await page.waitForTimeout(500);
  const y = await page.locator('#preuves').evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
  // Juste avant que la section des preuves n'apparaisse : le compteur ne doit pas avoir démarré.
  await page.evaluate((v) => { (window as any).__lenis?.stop(); window.scrollTo(0, v - window.innerHeight - 150); }, y);
  await page.waitForTimeout(300);
  await expect(page.locator('[data-count="25"]')).toHaveText('25');
  // Puis à l'écran : il compte.
  await page.evaluate((v) => window.scrollTo(0, v - 500), y);
  await page.waitForTimeout(150);
  const early = Number(await page.locator('[data-count="25"]').textContent());
  expect(early).toBeLessThan(25);
  await expect(page.locator('[data-count="25"]')).toHaveText('25', { timeout: 4000 });
});

test('écran bas (1280×680) : pendant l’épinglage, les 4 étapes restent dans l’écran', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 680 });
  await page.goto('./');
  await page.locator('#adoucissement').scrollIntoViewIfNeeded();
  await expect(page.locator('html')).toHaveClass(/seq-live/, { timeout: 8000 });
  const top = await page.locator('#adoucissement').evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
  await page.evaluate((v) => { (window as any).__lenis?.stop(); window.scrollTo(0, v + 300); }, top);
  await page.waitForTimeout(600);
  const b = await page.locator('[data-seq-step="3"]').evaluate((e) => e.getBoundingClientRect().bottom);
  expect(b).toBeLessThanOrEqual(680);
});

test('séquence : aucun effet recalculé à chaque image (masque, flou d’arrière-plan, mélange)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await page.locator('#adoucissement').scrollIntoViewIfNeeded();
  await expect(page.locator('html')).toHaveClass(/seq-live/, { timeout: 8000 });
  const costly = await page.$$eval('#adoucissement *', (els) => els.filter((e) => {
    const s = getComputedStyle(e);
    return (s.maskImage && s.maskImage !== 'none') || (s.webkitMaskImage && s.webkitMaskImage !== 'none')
      || (s.backdropFilter && s.backdropFilter !== 'none') || s.mixBlendMode !== 'normal'
      || (s.filter && s.filter !== 'none');
  }).map((e) => e.className || e.tagName));
  expect(costly).toEqual([]);
});
