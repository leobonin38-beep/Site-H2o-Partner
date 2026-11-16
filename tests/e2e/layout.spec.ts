import { test, expect } from '@playwright/test';

for (const width of [1440, 360]) {
  test(`pas de défilement horizontal à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('./');
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over).toBeLessThanOrEqual(0);
  });
}

test('en-tête : téléphone, bouton diagnostic, logo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  const header = page.locator('header.site-header');
  await expect(header.locator('.bar a[href^="tel:+33476069212"]')).toBeVisible();
  await expect(header.getByRole('link', { name: 'Demander un diagnostic' })).toBeVisible();
  await expect(header.getByRole('img', { name: /H2O Partner/ })).toBeVisible();
});

test('méga-menu accessible au clavier', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  const trigger = page.locator('header.site-header button[aria-controls="mega-particuliers"]');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mega-particuliers').getByRole('link', { name: /Vrai ou faux/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

test('menu téléphone : ouverture, Échap, retour du focus', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto('./');
  const burger = page.getByRole('button', { name: 'Menu' });
  await expect(burger).toBeVisible();
  await burger.click();
  await expect(burger).toHaveAttribute('aria-expanded', 'true');
  const panel = page.locator('#menu-mobile');
  await expect(panel.getByRole('link', { name: 'Désembouage' })).toBeVisible();
  await expect(panel.locator('a[href^="tel:"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(burger).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
  await expect(burger).toBeFocused();
});

test('pied de page : coordonnées et PDF', async ({ page }) => {
  await page.goto('./');
  const f = page.locator('footer.site-footer');
  await expect(f).toContainText('134 chemin du Randan');
  await expect(f).toContainText('38590 Sillans');
  await expect(f.locator('a[href^="mailto:commercial@h2o-partner.fr"]')).toHaveCount(1);
  await expect(f.locator('a[href$=".pdf"]')).toHaveCount(4);
  await expect(f).toContainText('aucun cookie');
});

test('menu téléphone ouvert : vraie boîte de dialogue, le reste de la page est inerte', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto('./');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('#menu-mobile')).toHaveAttribute('role', 'dialog');
  await expect(page.locator('#menu-mobile')).toHaveAttribute('aria-modal', 'true');
  expect(await page.locator('main').evaluate((e) => (e as HTMLElement).inert)).toBe(true);
  expect(await page.locator('footer.site-footer').evaluate((e) => (e as HTMLElement).inert)).toBe(true);
  await page.keyboard.press('Escape');
  expect(await page.locator('main').evaluate((e) => (e as HTMLElement).inert)).toBe(false);
});

test('sans JavaScript : la navigation reste accessible', async ({ browser }) => {
  const base = test.info().project.use.baseURL!;
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 760 } });
  const page = await ctx.newPage();
  await page.goto(base);
  await expect(page.locator('[data-burger]')).toBeHidden();
  const nojs = page.locator('.site-header a.burger-nojs');
  await expect(nojs).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('header.site-header .nav a[href$="/particuliers/"]').first()).toBeVisible();
  await ctx.close();
});

test('survol puis clic sur « Particuliers » : on arrive sur la page Particuliers', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  const link = page.locator('header.site-header .nav a[href$="/particuliers/"]').first();
  await link.hover();
  await page.waitForTimeout(150);
  await link.click();
  await expect(page).toHaveURL(/\/particuliers\/$/);
});

test('la mention « France » précise l’exception de la tête d’adoucisseur', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#preuves')).toContainText('sauf la tête');
});
