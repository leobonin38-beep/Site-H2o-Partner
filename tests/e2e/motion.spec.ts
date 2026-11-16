import { test, expect } from '@playwright/test';

test('sans JavaScript, tout est visible', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(new URL('./', test.info().project.use.baseURL!).href);
  const hidden = await page.$$eval('main h1, main h2, main h3, main p, main img, main li', (els) =>
    els.filter((e) => getComputedStyle(e).opacity !== '1' || getComputedStyle(e).visibility === 'hidden').length);
  expect(hidden).toBe(0);
  await ctx.close();
});

test('mouvement réduit : le titre est visible tout de suite', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(new URL('./', test.info().project.use.baseURL!).href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(100);
  expect(await page.locator('h1').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  await ctx.close();
});

test('le titre finit visible et Lenis n’est lancé qu’une fois, même après un retour arrière', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await expect.poll(() => page.evaluate(() => (window as any).__motionReady === true), { timeout: 5000 }).toBe(true);
  await page.waitForTimeout(1600);
  expect(await page.locator('h1').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  expect(await page.evaluate(() => (window as any).__lenisCount)).toBe(1);
  await page.goto('./mentions-legales/');
  await page.goBack();
  await page.waitForTimeout(1600);
  expect(await page.locator('h1').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  expect(await page.evaluate(() => (window as any).__lenisCount)).toBe(1);
});

test('les éléments révélés finissent visibles après défilement complet', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
  });
  await page.waitForTimeout(1500);
  const stuck = await page.$$eval('[data-reveal-img], [data-reveal-text], [data-count]', (els) =>
    els.filter((e) => Number(getComputedStyle(e).opacity) < 1 || getComputedStyle(e).clipPath.includes('100%')).map((e) => e.outerHTML.slice(0, 80)));
  expect(stuck).toEqual([]);
  await expect(page.locator('[data-count="25"]')).toHaveText('25');
});

test('aucune erreur dans la console', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./', { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } });
  expect(errors).toEqual([]);
});

test('le grand nom du pied de page n’est pas coupé', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2500);
  const r = await page.locator('[data-wordmark]').evaluate((el) => {
    const cs = getComputedStyle(el);
    const clipped = [el, ...el.querySelectorAll('*')].some((n) => {
      const s = getComputedStyle(n as Element);
      return (s.overflow !== 'visible' || s.clipPath !== 'none') && (n as HTMLElement).getBoundingClientRect().height < parseFloat(cs.fontSize) * 0.98;
    });
    return { ratio: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize), clipped };
  });
  expect(r.clipped).toBe(false);
  expect(r.ratio).toBeGreaterThanOrEqual(0.98);
});

test('cartes métiers empilées : jamais assombries au-delà de 90 % pendant le défilement', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./', { waitUntil: 'networkidle' });
  await expect.poll(() => page.evaluate(() => (window as any).__motionReady === true)).toBe(true);
  const cards = page.locator('[data-card]');
  for (const frac of [0.9, 0.7, 0.5]) {
    const y = await cards.nth(1).evaluate((e, f) => e.getBoundingClientRect().top + window.scrollY - window.innerHeight * f, frac);
    await page.evaluate((v) => { (window as any).__lenis?.scrollTo(v, { immediate: true }) ?? window.scrollTo(0, v); }, y);
    await page.waitForTimeout(400);
    const filter = await cards.nth(0).evaluate((e) => getComputedStyle(e).filter);
    const m = filter.match(/brightness\(([\d.]+)\)/);
    const b = m ? Number(m[1]) : 1;
    expect(b, `${frac} : ${filter}`).toBeGreaterThanOrEqual(0.9);
  }
});
