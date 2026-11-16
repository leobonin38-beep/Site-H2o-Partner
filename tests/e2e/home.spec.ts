import { test, expect } from '@playwright/test';

test('vidéo du haut de page : muette, en ligne, avec image d’attente', async ({ page }) => {
  await page.goto('./');
  const v = page.locator('.hero video');
  await expect(v).toHaveCount(1);
  expect(await v.evaluate((el: HTMLVideoElement) => el.muted)).toBe(true);
  await expect(v).toHaveAttribute('playsinline', '');
  await expect(v).toHaveAttribute('poster', /hero-poster/);
});

test('avant / après réglable au clavier', async ({ page }) => {
  await page.goto('./');
  const r = page.getByRole('slider', { name: /avant.*après/i });
  await r.scrollIntoViewIfNeeded();
  await expect(r).toHaveValue('50');
  await r.focus();
  await page.keyboard.press('ArrowRight');
  await expect(r).toHaveValue('51');
});

test('règle de dureté : 28 °f donne « dure » et 83 mg/L', async ({ page }) => {
  await page.goto('./');
  const th = page.locator('#th');
  await th.scrollIntoViewIfNeeded();
  await th.fill('28');
  await page.locator('#cible').fill('10');
  await expect(page.locator('#th-classe')).toHaveText('dure');
  await expect(page.locator('#sodium')).toHaveText('83');
});

test('chaque image a un texte alternatif et des dimensions', async ({ page }) => {
  await page.goto('./');
  const bad = await page.$$eval('img', (imgs) => imgs.filter((i) => {
    const alt = i.getAttribute('alt');
    const decorative = alt === '' && (i.getAttribute('aria-hidden') === 'true' || i.closest('[aria-hidden="true"]'));
    return (alt === null || (alt === '' && !decorative)) || !i.getAttribute('width') || !i.getAttribute('height');
  }).map((i) => i.outerHTML.slice(0, 120)));
  expect(bad).toEqual([]);
});

test('les sections de l’accueil sont présentes dans l’ordre', async ({ page }) => {
  await page.goto('./');
  const ids = await page.$$eval('main > section[id]', (s) => s.map((x) => x.id));
  expect(ids).toEqual(['haut', 'methode', 'adoucissement', 'metiers', 'preuves', 'chez-vous', 'entreprise', 'contact']);
});

test('aucun faux avis ni note', async ({ page }) => {
  await page.goto('./');
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/\/5\b|étoiles|avis clients/i);
});
