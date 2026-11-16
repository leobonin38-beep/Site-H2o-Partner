import { test, expect } from '@playwright/test';

test('diagnostic : étapes, validation, retour en arrière sans perte, message prêt', async ({ page }) => {
  await page.goto('diagnostic/');
  const form = page.locator('form[data-diag]');
  await expect(form.locator('[data-step-label]')).toHaveText('Étape 1 sur 4');
  await expect(form.locator('fieldset[data-step]').nth(1)).toBeHidden();
  await expect(form.getByRole('button', { name: 'Retour' })).toBeHidden();
  await expect(form.getByRole('button', { name: 'Envoyer ma demande' })).toBeHidden();
  await form.getByRole('button', { name: 'Continuer' }).click();
  await expect(form.locator('[data-error]').first()).toBeVisible();          // rien choisi
  await form.getByLabel('Un particulier').check();
  await form.getByRole('button', { name: 'Continuer' }).click();
  await expect(form.locator('[data-step-label]')).toHaveText('Étape 2 sur 4');
  await form.getByLabel('Calcaire, eau dure').check();
  await form.getByRole('button', { name: 'Continuer' }).click();
  await form.getByLabel('Commune').fill('Voiron');
  await form.getByRole('button', { name: 'Retour' }).click();
  await expect(form.getByLabel('Calcaire, eau dure')).toBeChecked();
  await form.getByRole('button', { name: 'Continuer' }).click();
  await expect(form.getByLabel('Commune')).toHaveValue('Voiron');
  await form.getByRole('button', { name: 'Continuer' }).click();
  await expect(form.locator('[data-step-label]')).toHaveText('Étape 4 sur 4');
  await form.getByLabel('Nom').fill('Jeanne Martin');
  await form.getByRole('button', { name: 'Envoyer ma demande' }).click();
  await expect(form.locator('[data-error]').filter({ hasText: /téléphone ou un e-mail/ })).toBeVisible();
  await form.getByLabel('Téléphone').fill('06 00 00 00 00');
  await form.getByRole('button', { name: 'Envoyer ma demande' }).click();
  const done = page.locator('[data-done]');
  await expect(done).toBeVisible();
  const href = await done.locator('a[href^="mailto:"]').getAttribute('href');
  expect(href).toContain('commercial@h2o-partner.fr');
  expect(decodeURIComponent(href!)).toContain('Commune : Voiron');
});

test('diagnostic sans JavaScript : toutes les étapes sont visibles', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(new URL('diagnostic/', test.info().project.use.baseURL!).href);
  for (const f of await page.locator('form[data-diag] fieldset').all()) await expect(f).toBeVisible();
  await ctx.close();
});

test('contact : formulaire, coordonnées, carte au clic seulement', async ({ page }) => {
  const osm: string[] = [];
  page.on('request', (r) => { if (/openstreetmap/.test(r.url())) osm.push(r.url()); });
  await page.goto('contact/', { waitUntil: 'networkidle' });
  await expect(page.locator('main')).toContainText('04 76 06 92 12');
  expect(osm).toEqual([]);
  await page.getByRole('button', { name: /Afficher la carte/ }).click();
  await expect(page.locator('iframe[src*="openstreetmap"]')).toHaveCount(1);
  const form = page.locator('form[data-contact]');
  await form.getByLabel('Nom').fill('Paul');
  await form.getByLabel('E-mail').fill('paul@example.com');
  await form.getByLabel('Votre message').fill('Bonjour');
  await form.getByRole('button', { name: 'Envoyer' }).click();
  await expect(page.locator('[data-done]')).toBeVisible();
});
