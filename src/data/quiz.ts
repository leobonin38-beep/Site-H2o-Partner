// Les 11 idées reçues, d'après un document de l'Union des professionnels du traitement de l'eau (UAE).
// Textes repris de la V2 (eux-mêmes repris de l'ancien site).
export type QuizItem = { q: string; answer: 'vrai' | 'faux'; why: string };
export const QUIZ: QuizItem[] = [
  { q: 'Un adoucisseur favorise la prolifération bactérienne.', answer: 'faux', why: "Dans un adoucisseur où l'eau circule régulièrement, les éventuelles bactéries résiduelles ne représentent pas un risque pour la santé. Mieux : en évitant l'entartrage, l'adoucissement est un traitement préventif contre des bactéries comme la légionelle, qui trouve refuge dans le tartre. Il faut veiller au bon réglage de l'appareil et à sa maintenance annuelle." },
  { q: "L'adoucissement n'entraîne ni agressivité, ni corrosivité de l'eau.", answer: 'vrai', why: "La corrosivité est le pouvoir de dissoudre le métal, l'agressivité celui de dissoudre le calcaire. L'adoucissement n'a aucun impact sur ces deux propriétés : il remplace les ions calcium et magnésium par des ions sodium." },
  { q: "Un adoucisseur respecte le porte-monnaie et l'environnement.", answer: 'vrai', why: "Le tartre augmente la consommation d'énergie des équipements de chauffage et de l'électroménager. L'eau adoucie maîtrise la facture d'énergie, allonge la durée de vie des appareils et permet d'utiliser moins de savon, de lessive et de produits anticalcaire. Source ADEME, « Eau chaude sanitaire en maison individuelle », février 1991." },
  { q: "L'eau adoucie est potable.", answer: 'vrai', why: "L'adoucissement sur résines échangeuses d'ions fait partie des procédés reconnus par le ministère de la Santé pour le traitement des eaux destinées à la consommation humaine. Circulaire DGS n° 2000-166 du 28 mars 2000." },
  { q: "Boire de l'eau adoucie peut provoquer une carence en calcium.", answer: 'faux', why: "Le calcium est très présent dans l'alimentation (produits laitiers, légumes, fruits secs…). Une alimentation équilibrée couvre les besoins de l'organisme, même sans calcium dans l'eau de boisson." },
  { q: "Un adoucisseur augmente la consommation d'eau.", answer: 'faux', why: "Bien dimensionné, réglé et entretenu, un adoucisseur rejette 5 à 8 m³ d'eau par an, pour une consommation moyenne de 200 m³ par foyer : 4 % de plus au maximum, soit moins de 30 euros par an." },
  { q: "L'eau adoucie a un goût salé.", answer: 'faux', why: "Le goût salé vient de l'association du chlorure et du sodium (le sel de table). Dans l'eau adoucie, seule la teneur en sodium augmente légèrement : 4,6 mg par litre pour 1 °f adouci. La teneur en chlorure reste inchangée." },
  { q: "L'eau froide ne doit pas être adoucie.", answer: 'faux', why: "Rien n'empêche d'adoucir l'eau froide dans une maison individuelle. Un adoucisseur correctement dimensionné, installé et entretenu n'altère pas la potabilité, et la plupart des appareils qui chauffent l'eau sont raccordés sur l'eau froide." },
  { q: "On ne doit pas adoucir l'eau en dessous de 15 °f.", answer: 'faux', why: "La réglementation n'exige pas de dureté résiduelle. Il faut cependant tenir compte de la teneur limite en sodium de l'eau potable : seul un installateur qualifié saura déterminer avec vous le bon seuil, selon votre installation." },
  { q: 'Tous les sels se valent.', answer: 'faux', why: "Le sel de régénération doit être d'une grande pureté. Sa qualité est garantie s'il est conforme à la norme NF EN 973 ; certains sels portent en plus le label NF, gage d'un niveau de qualité supérieur." },
  { q: 'Un adoucisseur doit être entretenu au moins une fois par an par un professionnel.', answer: 'vrai', why: "Comme une chaudière. Le technicien vérifie les réglages, nettoie le bac à sel et les résines, et contrôle les cycles hydrauliques : de quoi garantir le bon fonctionnement de l'appareil et la qualité bactériologique de l'eau." },
];

export function faqLd(items: QuizItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: `${it.answer === 'vrai' ? 'Vrai' : 'Faux'}. ${it.why}` },
    })),
  };
}
