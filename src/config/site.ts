// Faits vérifiés sur l'entreprise (source : ancien site h2o-partner.fr, note 01 du coffre).
// N'ajouter ici que des informations confirmées par l'entreprise.
export const SITE = {
  name: 'H2O Partner',
  slogan: "Votre équipier du traitement de l'eau",
  legalName: 'SARL H2O Partner',
  street: '134 chemin du Randan',
  postalCode: '38590',
  city: 'Sillans',
  region: 'Isère',
  country: 'FR',
  phone: '04 76 06 92 12',
  phoneIntl: '+33476069212',
  email: 'commercial@h2o-partner.fr',
  area: ['Isère', 'Rhône-Alpes'],
  years: 25,
} as const;

export type NavChild = { label: string; href: string; desc: string };
export type NavItem = { label: string; href: string; children?: NavChild[] };

export const NAV: NavItem[] = [
  {
    label: 'Particuliers', href: '/particuliers/', children: [
      { label: 'Adoucisseurs Privilège', href: '/particuliers/adoucisseur-privilege/', desc: 'Privilège 20 L et Petit Privilège 8 L' },
      { label: 'Pourquoi un adoucisseur', href: '/particuliers/pourquoi-un-adoucisseur/', desc: 'Installation, confort, économies' },
      { label: 'Vrai ou faux', href: '/particuliers/verite-sur-adoucisseur/', desc: '11 idées reçues sur l’adoucisseur' },
    ],
  },
  { label: 'Installateurs', href: '/installateurs/' },
  {
    label: 'Collectif & tertiaire', href: '/collectif-tertiaire/', children: [
      { label: 'Matériel CLACK', href: '/collectif-tertiaire/materiel-clack/', desc: 'Adoucisseurs, filtre magnétique à poche' },
      { label: 'Désembouage', href: '/collectif-tertiaire/desembouage/', desc: 'Circuits de chauffage collectif' },
      { label: 'Désinfection des réseaux', href: '/collectif-tertiaire/desinfection-reseaux/', desc: 'EFS et ECS, préventif ou curatif' },
    ],
  },
  { label: 'Industrie', href: '/industrie/' },
  { label: 'Entretien', href: '/entretien-sav/' },
  { label: "L'entreprise", href: '/entreprise/' },
];
