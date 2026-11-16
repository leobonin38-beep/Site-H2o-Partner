import { test, expect } from '@playwright/test';

test('vrai ou faux : bonne réponse, explication, score', async ({ page }) => {
  await page.goto('particuliers/verite-sur-adoucisseur/');
  const q1 = page.locator('[data-quiz-item]').first();
  await expect(q1.locator('[data-quiz-answer]')).toBeHidden();
  await q1.getByRole('button', { name: 'Faux' }).click();
  await expect(q1.locator('[data-quiz-answer]')).toBeVisible();
  await expect(q1.locator('[data-quiz-verdict]')).toContainText('Bonne réponse');
  await expect(page.locator('[data-quiz-score]')).toHaveText('1 / 11');
  await expect(q1.getByRole('button', { name: 'Vrai' })).toBeDisabled();
});

test('vrai ou faux : au clavier, et mauvaise réponse signalée', async ({ page }) => {
  await page.goto('particuliers/verite-sur-adoucisseur/');
  const q2 = page.locator('[data-quiz-item]').nth(1);
  await q2.getByRole('button', { name: 'Faux' }).focus();
  await page.keyboard.press('Enter');
  await expect(q2.locator('[data-quiz-verdict]')).toContainText('C’est vrai');
  await expect(page.locator('[data-quiz-score]')).toHaveText('0 / 11');
});

test('vrai ou faux sans JavaScript : toutes les réponses sont lisibles', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(new URL('particuliers/verite-sur-adoucisseur/', test.info().project.use.baseURL!).href);
  await expect(page.locator('[data-quiz-answer]')).toHaveCount(11);
  for (const a of await page.locator('[data-quiz-answer]').all()) await expect(a).toBeVisible();
  await ctx.close();
});

test('vrai ou faux : FAQ structurée de 11 questions', async ({ page }) => {
  await page.goto('particuliers/verite-sur-adoucisseur/');
  const lds = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((s) => JSON.parse(s));
  const faq = lds.find((o) => o['@type'] === 'FAQPage');
  expect(faq.mainEntity).toHaveLength(11);
  expect(faq.mainEntity[0].acceptedAnswer.text).toMatch(/^Faux\./);
});

test('page Privilège : les deux plaquettes et la norme d’installation', async ({ page }) => {
  await page.goto('particuliers/adoucisseur-privilege/');
  await expect(page.locator('main a[href$="plaquette-privilege.pdf"]')).toHaveCount(1);
  await expect(page.locator('main a[href$="plaquette-petit-privilege.pdf"]')).toHaveCount(1);
  await expect(page.locator('main')).toContainText('NF 14743');
  await expect(page.locator('main')).toContainText('20 litres');
});
