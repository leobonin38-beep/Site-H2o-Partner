import { describe, it, expect } from 'vitest';
import { localBusinessLd, breadcrumbLd } from '../../src/lib/schema';

describe('localBusinessLd', () => {
  const ld = localBusinessLd('https://www.h2o-partner.fr') as any;
  it('décrit l’entreprise avec les vraies coordonnées', () => {
    expect(ld['@type']).toBe('HomeAndConstructionBusiness');
    expect(ld.telephone).toBe('+33476069212');
    expect(ld.address.postalCode).toBe('38590');
    expect(ld.address.addressLocality).toBe('Sillans');
  });
  it('n’invente ni avis, ni note, ni horaires', () => {
    expect(ld.aggregateRating).toBeUndefined();
    expect(ld.review).toBeUndefined();
    expect(ld.openingHours).toBeUndefined();
    expect(ld.openingHoursSpecification).toBeUndefined();
  });
});

describe('breadcrumbLd', () => {
  it('numérote depuis 1 avec des URL absolues', () => {
    const ld = breadcrumbLd('https://www.h2o-partner.fr', [
      { name: 'Accueil', href: '/' },
      { name: 'Particuliers', href: '/particuliers/' },
    ]) as any;
    expect(ld.itemListElement.map((i: any) => i.position)).toEqual([1, 2]);
    expect(ld.itemListElement[1].item).toBe('https://www.h2o-partner.fr/particuliers/');
  });
});

describe('URL absolues sous un sous-dossier', () => {
  it('garde le sous-dossier de la base', () => {
    const ld = breadcrumbLd('https://exemple.github.io/Site-H2o-Partner/', [{ name: 'Particuliers', href: '/particuliers/' }]) as any;
    expect(ld.itemListElement[0].item).toBe('https://exemple.github.io/Site-H2o-Partner/particuliers/');
  });
});
