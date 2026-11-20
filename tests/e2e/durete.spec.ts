import { test, expect, type Page } from '@playwright/test';

// Réponses simulées des services publics (aucun appel réseau réel pendant les tests).
const VOIRON = { nom: 'Voiron', code: '38563', codesPostaux: ['38500'], population: 21847, departement: { code: '38', nom: 'Isère' } };
const LA_BUISSE = { nom: 'La Buisse', code: '38061', codesPostaux: ['38500'], population: 3300, departement: { code: '38', nom: 'Isère' } };
const UDI = [
  { annee: '2026', code_reseau: 'A', nom_reseau: 'VOIRON BAS SERVICE', nom_quartier: 'BS Centre Ville' },
  { annee: '2026', code_reseau: 'B', nom_reseau: 'VOIRON SOUILLETS', nom_quartier: 'Pet et Grd Souillet' },
  { annee: '2025', code_reseau: 'Z', nom_reseau: 'ANCIEN', nom_quartier: null },
];
const MES = [
  { date_prelevement: '2025-11-18T07:30:00Z', resultat_numerique: 21.3, code_reseau: ['A'], nom_reseau: ['VOIRON BAS SERVICE'] },
  { date_prelevement: '2025-09-01T07:30:00Z', resultat_numerique: 21.1, code_reseau: ['A'], nom_reseau: ['VOIRON BAS SERVICE'] },
  { date_prelevement: '2025-06-01T07:30:00Z', resultat_numerique: 21.5, code_reseau: ['A'], nom_reseau: ['VOIRON BAS SERVICE'] },
  { date_prelevement: '2025-10-14T09:55:00Z', resultat_numerique: 26.7, code_reseau: ['B'], nom_reseau: ['VOIRON SOUILLETS'] },
];

async function mock(page: Page, opts: { down?: boolean } = {}) {
  await page.route('https://geo.api.gouv.fr/**', (r) => {
    const u = new URL(r.request().url());
    if (u.pathname.endsWith('/38563')) return r.fulfill({ json: VOIRON });
    if (u.searchParams.get('codePostal') === '38500') return r.fulfill({ json: [LA_BUISSE, VOIRON] });
    const nom = (u.searchParams.get('nom') ?? '').toLowerCase();
    return r.fulfill({ json: 'voiron'.startsWith(nom) ? [VOIRON] : [] });
  });
  await page.route('https://hubeau.eaufrance.fr/**', (r) => {
    if (opts.down) return r.fulfill({ status: 503, body: '' });
    const u = new URL(r.request().url());
    if (u.pathname.endsWith('/communes_udi')) return r.fulfill({ json: { data: UDI } });
    return r.fulfill({ json: { data: MES } });
  });
}

test('page dureté : recherche par nom, fiche de la commune, diagnostic pré-rempli, adresse partageable', async ({ page }) => {
  await mock(page);
  await page.goto('durete-eau/');
  await expect(page.locator('h1')).toContainText("dureté de l'eau chez vous");
  const box = page.getByRole('combobox', { name: /commune/i });
  await box.fill('voir');
  await expect(page.getByRole('option', { name: /Voiron/ })).toBeVisible();
  await box.press('ArrowDown');
  await box.press('Enter');
  const card = page.locator('[data-ds-out] .card');
  await expect(card.locator('h2')).toHaveText("Dureté de l'eau à Voiron");
  await expect(card).toContainText('21,3');          // réseau principal (le plus analysé) : médiane 21,3
  await expect(card).toContainText('moyennement dure');
  await expect(card).toContainText('De 21,3 à 26,7 °f selon le quartier');
  await expect(card).toContainText('18 novembre 2025');
  await expect(card).toContainText("Hub'Eau");
  expect(decodeURIComponent((await card.locator('a.btn').getAttribute('href'))!)).toContain('commune=Voiron&durete=21.3');
  await expect(page).toHaveURL(/\?code=38563$/);
  await page.reload();
  await expect(page.locator('[data-ds-out] .card h2')).toHaveText("Dureté de l'eau à Voiron");
});

test('page dureté : recherche par code postal (communes triées par population)', async ({ page }) => {
  await mock(page);
  await page.goto('durete-eau/');
  const box = page.getByRole('combobox', { name: /commune/i });
  await box.fill('385');
  await expect(page.locator('[data-ds-status]')).toContainText('5 chiffres');
  await box.fill('38500');
  await expect(page.getByRole('option').first()).toContainText('Voiron');
  await expect(page.getByRole('option')).toHaveCount(2);
});

test('page dureté : service indisponible → message clair et bouton Réessayer', async ({ page }) => {
  await mock(page, { down: true });
  await page.goto('durete-eau/?code=38563');
  await expect(page.locator('[data-ds-out] .msg')).toContainText('ne répond pas');
  await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible();
});

test('diagnostic pré-rempli depuis la fiche', async ({ page }) => {
  await page.goto('diagnostic/?commune=Voiron&durete=24.5');
  await expect(page.locator('#d-commune')).toHaveValue('Voiron');
  await expect(page.locator('#d-durete')).toHaveValue('24.5');
});

test('accueil : chercher sa commune règle la règle de dureté', async ({ page }) => {
  await mock(page);
  await page.goto('./');
  const box = page.locator('#chez-vous').getByRole('combobox', { name: /commune/i });
  await box.scrollIntoViewIfNeeded();
  await box.fill('voiron');
  await page.getByRole('option', { name: /Voiron/ }).first().click();
  await expect(page.locator('#th')).toHaveValue('21');
  const mini = page.locator('#chez-vous [data-ds-mini]');
  await expect(mini).toContainText('Voiron : 21,3 à 26,7 °f');
  await expect(mini.locator('a')).toHaveAttribute('href', /durete-eau\/\?code=38563$/);
});

test('menu Particuliers : lien vers la dureté de l’eau', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await page.locator('button[aria-controls="mega-particuliers"]').click();
  await expect(page.locator('#mega-particuliers a[href$="/durete-eau/"]')).toBeVisible();
});
