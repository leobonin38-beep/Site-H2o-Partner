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
