# Site H2O Partner

Refonte du site [h2o-partner.fr](https://www.h2o-partner.fr/) : H2O Partner, votre équipier du traitement de l'eau (Sillans, Isère).

Site statique en HTML, CSS et JavaScript, sans étape de construction : il s'héberge tel quel, n'importe où.

## Voir le site en local

```bash
python3 -m http.server 8765
```

Puis ouvrir http://localhost:8765/ dans un navigateur.

## Contenu

Tout le contenu vient du site d'origine, réorganisé sur une page :

| Rubrique | Ce qu'on y trouve |
|---|---|
| Accueil | surface d'eau animée (réagit au pointeur), accroche, accès rapides |
| Votre besoin | sélecteur en deux clics : profil, puis besoin, qui affiche la réponse H2O Partner |
| Domaines | onglets Résidentiel, Collectif & tertiaire, Industrie |
| L'adoucisseur | schéma animé du trajet de l'eau, en 4 étapes suivies au défilement |
| Dureté de l'eau | simulateur (curseur de dureté, sodium apporté) et les 3 raisons de s'équiper |
| Matériel | Privilège, Petit Privilège, gamme CLACK à comparer, filtre magnétique à poche, plaquettes PDF |
| Prestations | désembouage, désinfection EFS & ECS, entretien |
| Vrai ou faux | quiz de 11 idées reçues (document de l'UAE) |
| Contact | coordonnées, carte chargée au clic, formulaire |

`mentions-legales.html` : mentions légales et données personnelles.

## Organisation

```
index.html               page principale
mentions-legales.html
assets/css/styles.css    toute la mise en forme
assets/js/app.js         défilement, animations, menu, sélecteur, quiz, formulaire
assets/js/water.js       eau animée de l'accueil (WebGL)
assets/js/schema.js      schéma animé de l'adoucisseur (canvas)
assets/vendor/           GSAP, ScrollTrigger, Lenis (copies locales)
assets/fonts/            polices Outfit et Manrope (copies locales)
assets/img/              logo, photos, visuels produits
docs/                    plaquettes et fiches techniques PDF
```

## Modifier le contenu

- Textes : directement dans `index.html`.
- Sélecteur « Votre besoin » : tableau `FINDER` dans `assets/js/app.js`.
- Repères de dureté du simulateur : tableau `CLASSES` dans `assets/js/app.js`.
- Après une modification de `styles.css` ou d'un script, augmenter le numéro `?v=1` dans les deux pages HTML pour forcer le rechargement chez les visiteurs.

## Choix techniques

- Aucune ressource externe au chargement : pas de cookie, pas de bandeau de consentement nécessaire. La carte OpenStreetMap ne se charge qu'au clic.
- Animations : Lenis (défilement fluide) et GSAP (apparitions, titres mot par mot). Le site reste lisible et utilisable sans JavaScript, et les animations sont coupées si le visiteur a activé « réduire les animations ».
- Le formulaire ouvre la messagerie du visiteur (`mailto:`), car un site statique ne peut pas envoyer d'e-mail seul.

## À faire avant la mise en ligne

- [ ] Compléter l'hébergeur dans `mentions-legales.html`.
- [ ] Faire valider les textes et les repères du simulateur de dureté par H2O Partner.
- [ ] Remplacer les photos par des photos de chantiers en meilleure définition.
- [ ] Brancher le formulaire sur un service d'envoi (Netlify Forms, Formspree…) si l'on veut recevoir les demandes sans passer par la messagerie du visiteur.
- [ ] Prévoir des redirections depuis les anciennes adresses (`27-residentiel.html`, etc.).
