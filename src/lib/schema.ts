import { SITE } from '../config/site';

const abs = (origin: string, href: string) => new URL(href.replace(/^\//, ''), origin.replace(/\/?$/, '/')).href;

export function localBusinessLd(origin: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': abs(origin, '/#entreprise'),
    name: SITE.name,
    legalName: SITE.legalName,
    slogan: SITE.slogan,
    url: abs(origin, '/'),
    logo: abs(origin, '/logo-h2o-partner.png'),
    telephone: SITE.phoneIntl,
    email: SITE.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.street,
      postalCode: SITE.postalCode,
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      addressCountry: SITE.country,
    },
    areaServed: SITE.area.map((name) => ({ '@type': 'AdministrativeArea', name })),
  };
}

export function breadcrumbLd(origin: string, items: { name: string; href: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(origin, it.href) })),
  };
}

export function serviceLd(origin: string, s: { name: string; description: string; href: string }): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: s.name,
    description: s.description,
    url: abs(origin, s.href),
    provider: { '@id': abs(origin, '/#entreprise') },
    areaServed: SITE.area.map((name) => ({ '@type': 'AdministrativeArea', name })),
  };
}
