import { test, expect } from '@playwright/test';

const INDEXABLE = process.env.PUBLIC_INDEXABLE === 'true';

test('accueil : balises SEO complètes', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('h1')).toHaveCount(1);
  const title = await page.title();
  expect(title.length).toBeGreaterThan(10);
  expect(title.length).toBeLessThanOrEqual(60);
  const desc = await page.locator('meta[name="description"]').getAttribute('content');
  expect(desc!.length).toBeGreaterThanOrEqual(50);
  expect(desc!.length).toBeLessThanOrEqual(160);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/^https?:\/\//);
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
  expect(await page.locator('html').getAttribute('lang')).toBe('fr');
  const lds = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(lds.length).toBeGreaterThan(0);
  for (const s of lds) expect(() => JSON.parse(s)).not.toThrow();
});

test('indexation pilotée par PUBLIC_INDEXABLE', async ({ page, request }) => {
  await page.goto('./');
  const robotsMeta = page.locator('meta[name="robots"]');
  const robots = await (await request.get('robots.txt')).text();
  if (INDEXABLE) {
    await expect(robotsMeta).toHaveCount(0);
    expect(robots).toContain('Sitemap:');
    expect(robots).not.toMatch(/Disallow: \/\s*$/m);
  } else {
    await expect(robotsMeta).toHaveAttribute('content', 'noindex, nofollow');
    expect(robots).toMatch(/Disallow: \/\s*$/m);
  }
});

test('page 404 en noindex', async ({ page }) => {
  await page.goto('404.html');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
