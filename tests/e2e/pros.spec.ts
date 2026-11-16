import { test, expect } from '@playwright/test';

test('gamme CLACK : 4 modèles, tableau lisible à 360 px sans déborder la page', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto('collectif-tertiaire/materiel-clack/');
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toContainText('6,1 m³/h');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(0);
  await expect(page.locator('main a[href$="documentation-vannes-clack.pdf"]')).toHaveCount(1);
  await expect(page.locator('main a[href$="fiche-filtre-magnetique-a-poche.pdf"]')).toHaveCount(1);
});

test('collectif : le hub mène aux trois prestations', async ({ page }) => {
  await page.goto('collectif-tertiaire/');
  for (const s of ['materiel-clack/', 'desembouage/', 'desinfection-reseaux/'])
    await expect(page.locator(`main a[href$="collectif-tertiaire/${s}"]`).first()).toBeVisible();
});

test('désinfection : protocole en 4 étapes et validation COFRAC', async ({ page }) => {
  await page.goto('collectif-tertiaire/desinfection-reseaux/');
  await expect(page.locator('[data-rail-step]')).toHaveCount(4);
  await expect(page.locator('main')).toContainText('COFRAC');
});

test('pages de prestation : données structurées Service', async ({ page }) => {
  for (const p of ['installateurs/', 'collectif-tertiaire/desembouage/', 'industrie/', 'entretien-sav/']) {
    await page.goto(p);
    const lds = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((s) => JSON.parse(s));
    expect(lds.some((o) => o['@type'] === 'Service'), p).toBe(true);
  }
});
