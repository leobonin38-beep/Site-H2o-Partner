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
