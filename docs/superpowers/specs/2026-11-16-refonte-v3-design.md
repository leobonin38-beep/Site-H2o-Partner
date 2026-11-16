# H2O Partner — Refonte V3 : document de conception

Date : 2026-11-16 · Statut : à valider par Léo · Branche : `v3` du dépôt `Site-H2o-Partner`
Mémoire du projet : coffre Obsidian, `1 - Projets/H2O Partner/` (notes 15 et suivantes).

## 1. Intention

H2O Partner (SARL, 134 chemin du Randan, 38590 Sillans, Isère ; 04 76 06 92 12 ; commercial@h2o-partner.fr) traite l'eau des particuliers (via les plombiers-chauffagistes), du collectif et du tertiaire, et de l'industrie, depuis 25 ans.

Le site doit **attirer des clients, faire la promotion de la société et la mettre en avant**. C'est la priorité de Léo. La V2 en ligne est jugée « trop sage, trop vide, sans effets ». Léo demande une refonte complète, moderne, avec une finition visible : des effets **pas tape-à-l'œil mais qui font « bien fini »**, de la vidéo, et un **référencement Google** soigné dès le départ.

### Critères de réussite
- Léo trouve le site « pro », vivant et mémorable quand il le compare à Culligan, BWT, Kinetico, Quooker et Xylem.
- Un visiteur comprend en 5 secondes qui est H2O Partner, pour qui, où, et comment le contacter.
- Chaque page vise une recherche réelle (par exemple « adoucisseur Isère », « désembouage chauffage collectif »), avec un balisage complet.
- Lighthouse sur téléphone : Performance ≥ 90 ; Accessibilité, Bonnes pratiques et SEO ≥ 95. LCP < 2,5 s en 4G simulée ; CLS < 0,05.

### Non-objectifs
- Pas de boutique en ligne, d'espace client ni de prise de rendez-vous en ligne.
- Pas de remplacement de h2o-partner.fr maintenant : il aura lieu plus tard, sur décision de Léo.
- Pas de refonte du logo : il est gardé tel quel.

### Anti-objectifs (échec même si « ça marche »)
- **Un fait inventé** : avis, notes, chiffres, certifications, partenaires, villes desservies, nombre de techniciens. Le modèle v3 de Léo en contenait (note 4,9/5, avis « Famille Martin », logos BWT, Culligan et Veolia) : ils ne reviennent pas.
- Un effet qui ralentit, cache le contenu ou rend la lecture pénible : 3D gadget, défilement détourné, texte illisible pendant une animation.
- Le style « gabarit » : cartes arrondies et ombres partout, pastilles, dégradés décoratifs, majuscules partout.
- Des pages vides ou creuses (le reproche fait à la V1 et à la V2).

## 2. Contraintes
- **Contenu source** : les textes de l'ancien site (20 pages, entre 34 et 1 075 mots par page, donc maigres), les textes de la V2 (dont les ajouts de Claude déjà listés dans la note 13 du coffre), les 4 PDF de `docs/`, les visuels produits (300 à 470 px de large seulement).
- **Photos** : aucune vraie photo de l'entreprise pour l'instant. On utilise des photos libres de droits : les 36 photos Pexels de `sources-v2/photos/` (sources dans `SOURCES.tsv`), plus d'autres si besoin. On en garde la source et la licence. Elles seront remplacées plus tard.
- **Vidéo d'accueil** : celle de Léo (`Modèle v3 de Léo/webotheque/images/Water_Filtration_Header_Video_Generation.mp4`, Veo, 8 s, 1280 × 720, avec un filigrane « Veo » en bas à droite). D'autres vidéos peuvent être faites par Claude avec **Remotion** (gratuit) ou **Higgsfield** (0,5 crédit : toute dépense doit être annoncée à Léo avant), sinon par Léo avec Gemini (Veo).
- **Outils de génération d'images** : Léo a fait les images avant / après du tuyau (`tuyau_avant.png`, `tuyau_apres.png`, 1024 × 1024). Ce sont des illustrations générées : elles doivent être présentées comme telles.
- **Langue** : français uniquement.
- **Polices** : hébergées en local, sous licence libre.
- **Aucun cookie** et aucun service tiers au chargement, donc pas de bandeau de consentement. La carte et les éventuelles statistiques respectent cette règle (voir § 7).

## 3. Approches envisagées

| | Approche | Pour | Contre |
|---|---|---|---|
| **A — retenue** | **Astro** (site statique) + **GSAP** (ScrollTrigger, SplitText) + **Lenis** + **Remotion** pour les vidéos produites par le code | HTML statique servi tel quel, ce qui est idéal pour Google et la vitesse. En-tête, pied de page et balisage écrits une seule fois pour environ 20 pages. Images AVIF / WebP redimensionnées automatiquement (`astro:assets`). Plan du site et données structurées générés. Transitions de page natives. Composants React possibles au cas par cas. | Une étape de construction (`npm run build`). |
| B | Next.js + React (React Bits…) | Bibliothèque de composants | Beaucoup plus de JavaScript, hébergement plus lourd, aucun gain visuel par rapport à GSAP |
| C | HTML sans construction (comme la V2) | Rien à installer | 20 pages en copier-coller, images et balisage à la main |

Léo a laissé le choix technique à Claude (« ce qui sera le mieux en termes de qualité finale »). L'approche A a été annoncée à Léo, qui l'a acceptée le 2026-11-16. Travail dans la session cloud (Node 22, ffmpeg, Python, Chromium et Playwright pour les captures et les contrôles).

## 4. Direction artistique

**Décidé par Léo : direction « B, cinéma et matière ».** Le haut de l'accueil (et le haut des pages principales) est **sombre**, bleu nuit, porté par la vidéo d'eau et de verre. Le contenu est ensuite **clair** pour rester lisible. On joue sur le contraste entre la nuit (la technique, la matière, l'eau) et le jour (le conseil, les gens, les produits).

- **Couleurs** : Léo trouve celles de la V2 « correctes mais améliorables ». **Trois associations seront maquettées et Léo choisira.** Contraintes fixes : le logo reste tel quel (bleu `#272E7C`, rouge `#E8212B`), le rouge sert aux appels à l'action, et le contraste du texte respecte le niveau AA.
- **Typographie** : plus affirmée que la V2. La paire de polices est proposée avec chaque palette ; choix final de Léo avec la palette.
- **Grille et rythme** : grille de 12 colonnes, grands titres, sections pleine largeur qui alternent sombre et clair, de grandes photos. Pas de vide inutile : chaque écran a une image ou un élément vivant. Rayon des coins de 0 à 6 px, ombres très rares.
- **Iconographie** : filets fins, numéros de section, données en police à chasse fixe (°f, m³/h, litres). On garde le fil graphique de la V2, la graduation de dureté, mais en accent et non plus en thème.
- **Un seul niveau de « luxe »** : finition par les détails (micro-interactions, rythme typographique, transitions), pas par l'accumulation d'effets.

## 5. Plan du site (décidé par Claude, Léo l'a délégué)

Une page par intention de recherche. Les contenus maigres de l'ancien site sont regroupés plutôt qu'éparpillés.

| URL | Page | Contenu principal | Ancienne(s) adresse(s) à rediriger |
|---|---|---|---|
| `/` | Accueil | Vidéo, promesse, 4 marchés, séquence « comment l'eau devient douce », chiffres réels (25 ans, garantie 5 ans), règle de dureté, avant / après, l'entreprise, contact | `/index.html` |
| `/particuliers/` | Particuliers | Pourquoi traiter son eau ; adoucisseur, antitartre, filtres, déferrisation, UV ; entrée vers les sous-pages | `/27-residentiel.html`, `/31-actualites.html` |
| `/particuliers/adoucisseur-privilege/` | Adoucisseurs Privilège et Petit Privilège | Produits, organes, garantie, PDF, « comment ça marche » | `/34-materiel.html`, `/31-1-4-les-adoucisseurs-h2o-partner.html` |
| `/particuliers/pourquoi-un-adoucisseur/` | Pourquoi un adoucisseur | Raisons, économies, environnement | `/35-pourquoi-adoucisseur.html`, `/31-2-4-…environnement.html` |
| `/particuliers/verite-sur-adoucisseur/` | Vrai ou faux | 11 questions UAE (interactif + FAQ balisée), reconnaître un adoucisseur conforme | `/36-verite-sur-adoucisseur.html`, `/31-3-4-…reglementation.html` |
| `/installateurs/` | Plombiers-chauffagistes | Fourniture directe, conseil, formation, mise en service, SAV | — |
| `/collectif-tertiaire/` | Collectif & tertiaire | Hub, méthode en 4 étapes | `/28-collectif-tertiaire.html` |
| `/collectif-tertiaire/materiel-clack/` | Matériel CLACK et filtre magnétique | Tableau CLACK, filtre à poche, pompes doseuses, PDF | `/37-materiel.html` |
| `/collectif-tertiaire/desembouage/` | Désembouage | Étapes | `/38-desembouage.html` |
| `/collectif-tertiaire/desinfection-reseaux/` | Désinfection EFS / ECS | Étapes, préventif / curatif, laboratoire COFRAC | `/39-desinfection.html`, `/39-desinfection-sanitaire.html` |
| `/industrie/` | Industrie | Eau de process, TWIN / DUPLEX, osmose, maintenance | `/29-industrie.html` |
| `/entretien-sav/` | Entretien & SAV | Équipements entretenus, entretien annuel | `/40-entretien.html` |
| `/entreprise/` | L'entreprise | 25 ans, Sillans, façon de travailler, zone Isère et Rhône-Alpes, camionnette | — |
| `/diagnostic/` | Diagnostic guidé | Questionnaire en 4 étapes (profil, besoin, lieu, coordonnées) qui envoie une demande qualifiée | — |
| `/contact/` | Contact | Coordonnées, formulaire, carte au clic | `/30-contacter-h2o-partner.html` |
| `/mentions-legales/`, `/confidentialite/`, `/plan-du-site/`, `404` | Pages légales et utilitaires | Hébergeur, crédits photos, données du formulaire | `/32-mentions-legales.html`, `/33-plan-site.html` |

Navigation : Particuliers · Installateurs · Collectif & tertiaire · Industrie · Entretien · L'entreprise, avec le téléphone et le bouton rouge « Diagnostic gratuit » ou « Nous contacter » (libellé validé par Léo à la maquette ; « gratuit » seulement si l'entreprise le confirme). Méga-menus sur ordinateur pour Particuliers et Collectif (idée du modèle de Léo), menu plein écran sur téléphone.

**Les 3 anciens articles d'actualité** (100 à 150 mots chacun) sont **fusionnés** dans les pages Privilège, Pourquoi un adoucisseur et Vrai ou faux, vers lesquelles leurs adresses sont redirigées. Il n'y a **pas de rubrique Conseils au lancement**, pour éviter deux pages en concurrence sur la même recherche. La rubrique `/conseils/` (avec le balisage `Article`) sera créée quand il y aura de vrais articles nouveaux. *(Décision de Claude.)*

## 6. Mouvement et effets

Principe : **trois niveaux** sur chaque page. (1) Une entrée soignée en haut de page. (2) Un ou deux temps forts au défilement. (3) Des micro-interactions précises. Tout est lisible au repos, sans JavaScript et avec « réduire les animations ».

### Accueil
1. **Haut de page vidéo** : la vidéo Veo de Léo en plein écran, recadrée et légèrement agrandie pour **sortir le filigrane du cadre**, avec un voile bleu nuit. Elle est réencodée en H.264 et AV1/WebM (1080p et 720p pour téléphone, sans son), avec une image d'attente. Le titre monte ligne par ligne derrière un masque, et l'en-tête transparent devient opaque au défilement.
2. **Temps fort « Comment l'eau devient douce »** : une **séquence vidéo pilotée par le défilement**, fabriquée avec **Remotion**. Elle montre une coupe stylisée d'un adoucisseur : l'eau chargée de calcaire entre, la résine capte le calcaire, l'eau douce ressort, puis la régénération. 4 étapes de texte s'enchaînent à côté et une jauge en °f descend. Elle est dessinée par le code (vectoriel, couleurs exactes de la palette, sans crédits) et exportée en suite d'images WebP / AVIF lue dans un canvas (version allégée sur téléphone, image fixe en mode « réduire les animations »). Les valeurs en °f sont indiquées comme **exemples**.
3. **Les 4 marchés** : cartes pleine hauteur qui s'empilent au défilement (photo, titre, 3 prestations, lien). Une liste simple sur téléphone.
4. **Avant / après** : le tuyau entartré et le tuyau propre, avec un curseur à glisser (souris, doigt, clavier), mention « illustration ».
5. **Règle de dureté interactive** (logique de la V2) : je règle ma dureté et je vois quoi faire.
6. **Chiffres vrais uniquement** : 25 ans, garantie 5 ans (avec entretien annuel), attestation ACS, analyses par un laboratoire accrédité COFRAC, matériel fabriqué en France. Ils comptent à l'apparition.
7. **Bloc entreprise et contact** : camionnette, Sillans, téléphone en grand, bouton vers le diagnostic.

### Toutes les pages
- Transitions entre pages : View Transitions d'Astro (`<ClientRouter />` ou CSS `@view-transition`), avec un fondu et un léger glissement ; l'en-tête reste fixe.
- Photos révélées par un masque, avec un léger effet de profondeur (au plus 6 %).
- Survols : soulignés qui se dessinent, boutons avec un retour d'appui, curseur « voir » sur les cartes (ordinateur uniquement).
- Défilement doux avec Lenis, seulement à la souris (pas sur écran tactile).
- Pied de page sombre avec le nom de l'entreprise en très grand, révélé au défilement.

### Temps forts des pages intérieures (un ou deux par page)
- Les étapes (désembouage, désinfection, collectif) : une ligne de progression qui se remplit et des numéros qui s'allument.
- Vrai ou faux : cartes qui se retournent, score.
- Produits : photo produit sur fond calme, fiche technique en tableau, PDF.
- Plus tard, d'autres vidéos Remotion si elles servent le propos : par exemple l'embouage d'un circuit de chauffage pour la page Désembouage.

### Garde-fous
- JavaScript de la page d'accueil (hors images de la séquence) : au plus 120 Ko compressés. Les images de la séquence se chargent seulement à l'approche de la section.
- Aucune animation ne bloque la lecture plus de 600 ms. Aucun texte n'est caché si le JavaScript échoue.

## 7. Référencement (SEO) et données

- **Par page** : un `<title>` unique de 60 caractères au plus, une `meta description` unique, un seul H1, des titres en ordre, une URL propre, une adresse `canonical`, Open Graph et Twitter, une image de partage générée par page.
- **Données structurées JSON-LD** : `LocalBusiness` (ou `HomeAndConstructionBusiness`) avec le nom, l'adresse, le téléphone, l'e-mail et la zone (Isère, Rhône-Alpes : rien d'inventé) ; `Organization` et `WebSite` ; `Service` sur chaque page de prestation ; `BreadcrumbList` ; `FAQPage` sur le vrai ou faux. **Ni horaires ni avis tant que l'entreprise ne les a pas fournis.**
- **Technique** : `sitemap.xml` (`@astrojs/sitemap`), `robots.txt`, page 404, liens internes entre pages proches, fil d'Ariane visible, `alt` descriptifs, `lang="fr"`, images en AVIF / WebP avec `width` et `height`, polices préchargées, aucun JavaScript inutile.
- **Aperçu** : tant que h2o-partner.fr existe, chaque page de l'aperçu porte `noindex`, interrupteur par variable d'environnement : `PUBLIC_INDEXABLE=false` par défaut. Au lancement : on retire le `noindex`, `site` vaut `https://www.h2o-partner.fr`, on met en place les **redirections 301** du tableau du § 5 (fichier `_redirects` ou configuration de l'hébergeur), on déclare le site dans Search Console et on envoie le plan du site.
- **Hors site, à proposer à Léo au lancement** : une fiche **Google Business Profile**, des annuaires locaux, des liens depuis les fabricants partenaires.
- **Contenu** : les pages sont enrichies de textes explicatifs (fonctionnement, conseils), écrits par Claude **à partir de connaissances générales vérifiables** et **listés dans `docs/textes-a-relire.md`** pour relecture par Léo et l'entreprise. Aucune promesse chiffrée nouvelle.

## 8. Formulaires
- **Diagnostic** (`/diagnostic/`) et **Contact** : envoi par **Web3Forms** (gratuit, sans serveur, sans cookie) vers commercial@h2o-partner.fr. Il faut une **clé d'accès Web3Forms créée avec l'adresse de l'entreprise** (à obtenir de Léo). En attendant, et en secours si le service ne répond pas : un lien `mailto:` pré-rempli.
- Validation accessible, message de confirmation, protection anti-robots (champ piège plus hCaptcha de Web3Forms seulement si nécessaire), mention RGPD avec un lien vers `/confidentialite/`.
- Carte : OpenStreetMap chargée au clic seulement, comme dans la V2.

## 9. Accessibilité
WCAG 2.1 AA : contrastes, navigation au clavier (menu, méga-menu, curseur avant / après, diagnostic), focus visible, `prefers-reduced-motion` respecté partout, vidéo sans son et sans information essentielle, sous-titrage non nécessaire.

## 10. Prévisualisation, publication, hébergement
- Le code est sur la branche `v3`. La V2 en ligne (branche `refonte-site`) n'est **pas touchée** pendant la construction.
- **Aperçus pour Léo** : un lien privé (Artifact claude.ai) contenant le site construit, mis à jour à chaque étape, plus des captures sur ordinateur (1440 px) et téléphone (390 px) critiquées avant envoi.
- **Aperçu public** : un dépôt n'a qu'un site GitHub Pages, donc publier la V3 sur Pages **remplacerait la V2**. Ce sera fait seulement quand Léo le décidera. D'ici là, les aperçus restent privés (Artifact). *(Décision de Claude.)*
- **Chemins** : `site` et `base` d'Astro sont réglés par des variables d'environnement (`SITE_URL`, `BASE_PATH`). Le même code sert à la racine (Artifact, futur domaine) ou sous `/Site-H2o-Partner/` (Pages). Tous les liens et les chemins des fichiers passent par `import.meta.env.BASE_URL`. Le contrôle des liens cassés tourne sur les deux configurations.
- **Hébergement final** (remplacement de h2o-partner.fr) : choisi plus tard. Recommandation : Cloudflare Pages ou Netlify (gratuits, redirections 301, en-têtes de cache), avec le domaine pointé depuis OVH.

## 11. Méthode et ordre de travail
1. **Trois maquettes de palette** sur le haut de l'accueil (sombre plus le début du clair), sur ordinateur et téléphone. Léo choisit.
2. **Maquette complète de l'accueil** dans le vrai projet Astro, avec la séquence Remotion. Comparaison côte à côte avec les sites de référence, critique, puis **validation de Léo**. Aucune autre page avant cette validation (règle du coffre).
3. Construction des pages, par familles (Particuliers, Pro, Utilitaires), avec des captures à chaque famille.
4. Contrôles : Lighthouse sur téléphone, test au clavier, `reduce motion`, sans JavaScript, liens cassés, validation des données structurées, poids des pages.
5. Mémoire : chaque étape est notée dans le coffre (fiche, note du projet, journal), commit et push.

## 12. Laissé au constructeur
Organisation des composants Astro, nommage CSS (variables CSS, sans Tailwind sauf vrai besoin), choix précis des photos libres par section, réglages d'animation (durées, courbes), découpage de la séquence Remotion (environ 120 à 180 images), formats d'export, outillage de test (Playwright).

## 13. Informations encore manquantes (à demander à Léo, non bloquantes)
- Vidéo d'accueil : la source fait 1280 × 720. Recadrée pour cacher le filigrane, elle sera un peu floue en plein écran sur un grand écran. Léo peut-il la régénérer en 1080p, sans filigrane, avec Gemini (Veo) ? En attendant : la vidéo est recadrée, encodée en 720p et adoucie par le voile ; pas de fausse version 1080p.
- Clé Web3Forms, à créer avec commercial@h2o-partner.fr, ou accord pour qu'on l'utilise.
- Hébergeur à citer dans les mentions légales (pour l'aperçu : GitHub).
- Confirmation de l'entreprise sur les textes ajoutés (`docs/textes-a-relire.md`), sur la gratuité du diagnostic et sur le lien Facebook.
- Plus tard : vraies photos, vrais avis, vrais partenaires, horaires, date de lancement.
