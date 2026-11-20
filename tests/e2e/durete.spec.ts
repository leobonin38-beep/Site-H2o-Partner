import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const DATA = JSON.parse(readFileSync(new URL('../../src/data/durete-isere.json', import.meta.url), 'utf8'));
const voiron = DATA.communes.find((c: any) => c.nom === 'Voiron');
const sillans = DATA.communes.find((c: any) => c.nom === 'Sillans');
const fr = (x: number) => x.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const mesurees = DATA.communes.filter((c: any) => c.th).length;

test('page Isère : recherche au clavier puis ouverture de la page de la commune', async ({ page }) => {
  await page.goto('durete-eau-isere/');
  await expect(page.locator('h1')).toContainText('Isère');
  const box = page.getByRole('combobox', { name: /commune/i });
  await box.fill('voir');
  await expect(page.getByRole('option', { name: /Voiron/ }).first()).toBeVisible();
  await box.press('ArrowDown');
  await box.press('Enter');
  await expect(page).toHaveURL(/durete-eau-isere\/voiron\/$/);
});

test('page Isère sans JavaScript : la liste de toutes les communes mesurées est en liens', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(new URL('durete-eau-isere/', test.info().project.use.baseURL!).href);
  await expect(page.locator('main a[href*="/durete-eau-isere/"][data-commune]')).toHaveCount(mesurees);
  await ctx.close();
});

test('page commune : chiffre officiel, fourchette par réseau, source, diagnostic pré-rempli', async ({ page }) => {
  await page.goto(`durete-eau-isere/${voiron.slug}/`);
  await expect(page.locator('h1')).toContainText('Voiron (38500)');
  const main = page.locator('main');
  await expect(main).toContainText(`${fr(voiron.th.principal)} °f`);
  await expect(main).toContainText(`${fr(voiron.th.min)} à ${fr(voiron.th.max)} °f`);
  await expect(main.locator('#quartiers .tbl table tbody tr')).toHaveCount(voiron.reseaux.length);
  await expect(main).toContainText("Hub'Eau");
  expect((await page.title()).length).toBeLessThanOrEqual(60);
  const diag = main.locator('a[href*="diagnostic/?"]').first();
  expect(decodeURIComponent((await diag.getAttribute('href'))!)).toContain('commune=Voiron');
  await expect(page.locator('#th')).toHaveValue(String(Math.round(voiron.th.principal)));
});

test('diagnostic pré-rempli depuis une page commune', async ({ page }) => {
  await page.goto('diagnostic/?commune=Voiron&durete=24.5');
  await expect(page.locator('#d-commune')).toHaveValue('Voiron');
  await expect(page.locator('#d-durete')).toHaveValue('24.5');
});

test('accueil : chercher sa commune règle la règle de dureté', async ({ page }) => {
  await page.goto('./');
  const box = page.locator('#chez-vous').getByRole('combobox', { name: /commune/i });
  await box.scrollIntoViewIfNeeded();
  await box.fill('sillans');
  await page.getByRole('option', { name: /Sillans/ }).first().click();
  await expect(page.locator('#th')).toHaveValue(String(Math.round(sillans.th.principal)));
  await expect(page.locator('#chez-vous [data-commune-result]')).toContainText('Sillans');
});

test('menu Particuliers : lien vers la dureté de l’eau en Isère', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await page.locator('button[aria-controls="mega-particuliers"]').click();
  await expect(page.locator('#mega-particuliers a[href$="/durete-eau-isere/"]')).toBeVisible();
});
