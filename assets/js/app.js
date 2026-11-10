/* ==========================================================
   H2O Partner · script principal
   Défilement fluide (Lenis), animations (GSAP), menu, sélecteur
   de besoin, onglets, simulateur de dureté, quiz, formulaire.
   Tout fonctionne aussi sans Lenis / GSAP (repli simple).
   ========================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var animate = hasGsap && !reduce;
  var root = document.documentElement;
  if (!animate) root.classList.add('no-motion');

  var header = $('.header');
  var lenis = null;

  /* ---------- défilement fluide ---------- */
  if (animate) gsap.registerPlugin(ScrollTrigger);
  if (animate && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, anchors: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToEl(el) {
    if (!el) return;
    var offset = -(header ? header.offsetHeight : 0) - 12;
    if (lenis) lenis.scrollTo(el, { offset: offset, duration: 1.3 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------- menu mobile ---------- */
  var burger = $('.burger'), nav = $('.nav');
  $$('.nav li').forEach(function (li, i) { li.style.setProperty('--i', i); });
  function setMenu(open) {
    if (!burger) return;
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
  }
  if (burger) {
    burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function () { setMenu(false); });
  }

  /* ---------- liens internes ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var target = id ? document.getElementById(id) : document.body;
    if (!target) return;
    e.preventDefault();
    setMenu(false);
    if (a.dataset.domaine) selectTab(a.dataset.domaine);
    if (a.dataset.materiel) target = document.getElementById(a.dataset.materiel) || target;
    if (a.dataset.sujet) prefill(a.dataset.sujet);
    scrollToEl(id === 'haut' ? document.body : target);
    if (id && id !== 'haut') history.replaceState(null, '', '#' + id);
  });

  /* ---------- en-tête : fond au défilement, masquage en descente ---------- */
  var lastY = 0, fab = $('.fab');
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    var down = y > lastY && y > 500 && !nav.classList.contains('is-open');
    header.classList.toggle('is-hidden', down);
    if (fab) fab.classList.toggle('is-on', y > 500);
    lastY = y;
    if (!animate) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var bar = $('.progress span');
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- menu actif selon la section ---------- */
  var links = $$('.nav li a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (l) { var s = $(l.getAttribute('href')); if (s) io.observe(s); });
  }

  /* ---------- titres découpés en mots ---------- */
  $$('[data-split]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w) { return '<span class="w" aria-hidden="true">' + w + '</span>'; }).join(' ');
  });

  /* ---------- animations ---------- */
  if (animate) {
    gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

    // accueil : entrée en scène
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.header', { yPercent: -100, duration: 0.9, clearProps: 'transform' }, 0.1)
      .from('.hero .eyebrow', { y: 20, opacity: 0, duration: 0.7 }, 0.25)
      .fromTo('.hero__title .w', { yPercent: 60, opacity: 0, rotate: 4 }, { yPercent: 0, opacity: 1, rotate: 0, duration: 1, stagger: 0.07 }, 0.35)
      .from('.hero__lead', { y: 24, opacity: 0, duration: 0.9 }, 0.8)
      .from('.hero__actions > *', { y: 24, opacity: 0, duration: 0.8, stagger: 0.1 }, 0.95)
      .from('.hero__tags li', { y: 16, opacity: 0, duration: 0.6, stagger: 0.07 }, 1.15);
    $('.hero__title').classList.add('is-done');

    // accueil : légère parallaxe à la sortie
    gsap.to('.hero__text', { yPercent: -10, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // titres de section : les mots s'éclaircissent au fil du défilement
    $$('[data-split]').forEach(function (el) {
      if (el.classList.contains('hero__title')) return;
      gsap.fromTo($$('.w', el), { opacity: 0.14 }, {
        opacity: 1, stagger: 0.12, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 48%', scrub: 0.4 }
      });
    });

    // blocs qui apparaissent (par groupes, avec un léger décalage)
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%', once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1, overwrite: true }); }
    });

    // compteurs
    $$('[data-count]').forEach(function (el) {
      var end = +el.dataset.count, o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () { gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v); } }); }
      });
    });

    // cartes produit : inclinaison douce sous le pointeur
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      $$('[data-tilt]').forEach(function (card) {
        var rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
        var ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
        gsap.set(card, { transformPerspective: 900 });
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 7);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
        });
        card.addEventListener('pointerleave', function () { rx(0); ry(0); });
      });
    }
  }

  /* ---------- schéma de l'adoucisseur : étape active ---------- */
  var steps = $$('.step');
  function setStep(n) {
    steps.forEach(function (s, i) { s.classList.toggle('is-active', i === n); });
    if (window.H2OSchema) window.H2OSchema.setStep(n);
  }
  if (steps.length && 'IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setStep(+en.target.dataset.step); });
    }, { rootMargin: window.matchMedia('(max-width: 860px)').matches ? '-72% 0px -27% 0px' : '-50% 0px -49% 0px' });
    steps.forEach(function (s) {
      so.observe(s);
      s.addEventListener('click', function () { setStep(+s.dataset.step); });
    });
  }

  /* ---------- onglets des domaines ---------- */
  var tabsRoot = $('[data-tabs]');
  var tabs = tabsRoot ? $$('[role="tab"]', tabsRoot) : [];
  var ink = tabsRoot ? $('.tabs__ink', tabsRoot) : null;
  function moveInk(tab) {
    if (!ink || !tab) return;
    ink.style.width = tab.offsetWidth + 'px';
    ink.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
  }
  function activateTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    moveInk(tab);
    if (focus) tab.focus();
    if (hasGsap) ScrollTrigger.refresh();
  }
  function selectTab(name) { var t = document.getElementById('tab-' + name); if (t) activateTab(t); }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { activateTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home') { e.preventDefault(); activateTab(tabs[0], true); }
      else if (e.key === 'End') { e.preventDefault(); activateTab(tabs[tabs.length - 1], true); }
      else if (d) { e.preventDefault(); activateTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });
  function inkNow() { moveInk(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]); }
  inkNow();
  window.addEventListener('resize', inkNow);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(inkNow);

  /* ---------- sélecteur de besoin ---------- */
  var FINDER = [
    { id: 'particulier', label: 'Un particulier', icon: 'i-home', form: 'Un particulier', besoins: [
      { label: 'Du calcaire dans la maison', titre: "L'adoucisseur Privilège", texte: "20 litres de résine, des matériels fabriqués en France et une installation avec filtre, flexibles inox et disconnecteur. Nous vous mettons en relation avec un plombier-chauffagiste partenaire de votre secteur.", points: ['Garantie 5 ans avec entretien annuel', 'Attestation de conformité sanitaire', 'Sans intermédiaire'], lien: '#materiel', lienTxt: 'Voir le Privilège' },
      { label: 'Un appartement, peu de place', titre: 'Le Petit Privilège', texte: "Un adoucisseur compact de 8 litres de résine, pensé pour les appartements où la place est limitée, avec les mêmes exigences de qualité que son grand frère.", points: ['8 litres de résine', 'Format compact', 'Garantie 5 ans avec entretien annuel'], lien: '#materiel', lienTxt: 'Voir le Petit Privilège' },
      { label: 'Une eau de source ou de forage', titre: 'Un traitement sur mesure', texte: "Matières en suspension, manganèse, fer, ammonium, calcaire ou bactéries : nous installons et entretenons le traitement adapté à votre eau, par filtration, déferrisation, UVc ou chloration.", points: ['Filtration', 'Déferrisation', 'UVc ou chloration'], lien: '#prestations', lienTxt: 'Voir nos prestations' },
      { label: "L'entretien de mon adoucisseur", titre: "L'entretien annuel", texte: "Comme une chaudière, un adoucisseur s'entretient au moins une fois par an : vérification des réglages, nettoyage du bac à sel et des résines, contrôle des cycles.", points: ['Au moins une fois par an', 'Qualité bactériologique préservée', 'Garantie maintenue'], lien: '#prestations', lienTxt: "Voir l'entretien" },
      { label: 'Je me pose des questions', titre: 'Vrai ou faux sur l\'adoucisseur', texte: "Goût salé, consommation d'eau, potabilité… Onze idées reçues passées au crible, d'après l'Union des professionnels du traitement de l'eau.", points: ['11 idées reçues', 'Sources officielles'], lien: '#vrai-faux', lienTxt: 'Faire le test' }
    ] },
    { id: 'installateur', label: 'Un plombier-chauffagiste', icon: 'i-wrench', form: 'Un plombier-chauffagiste', besoins: [
      { label: 'Du matériel pour mes clients', titre: 'Un fournisseur en direct', texte: "H2O Partner fournit aux plombiers-chauffagistes le meilleur matériel de traitement de l'eau, sans intermédiaire : un matériel très haut de gamme pour un prix modéré.", points: ['Fabrication française', 'ACS sur demande', 'Garantie 5 ans avec entretien annuel'], lien: '#materiel', lienTxt: 'Voir le matériel' },
      { label: 'Un accompagnement technique', titre: 'Conseil, formation, mise en service', texte: "Nous apportons de façon continue conseil et formation, assurons la mise en service du matériel après installation et le service après-vente.", points: ['Conseil', 'Formation', 'Mise en service', 'SAV'], lien: '#domaines', lienTxt: 'En savoir plus', domaine: 'residentiel' }
    ] },
    { id: 'tertiaire', label: 'Un établissement collectif ou tertiaire', icon: 'i-building', form: 'Un établissement collectif ou tertiaire', besoins: [
      { label: 'Dimensionner un adoucisseur', titre: 'Étude technique et gamme CLACK', texte: "Nous réalisons l'étude technique pour le bon choix du matériel et son dimensionnement, livrons jusqu'au chantier et assurons la mise en service. Débits de pointe de 6,1 à 26 m³/h.", points: ['Étude technique', 'Livraison sur chantier', 'SAV et garantie en direct'], lien: '#clack', lienTxt: 'Comparer la gamme' },
      { label: 'Un circuit de chauffage emboué', titre: 'Désembouage hydropneumatique', texte: "Injection d'un désembouant lent en amont, nettoyage circuit par circuit, analyses par un laboratoire indépendant, puis conditionnement des circuits. Le filtre magnétique à poche protège ensuite l'installation.", points: ['Écoles, Ehpad, copropriétés…', 'Analyses indépendantes', 'Filtre magnétique à poche'], lien: '#prestations', lienTxt: 'Voir le déroulé' },
      { label: 'Désinfecter un réseau sanitaire', titre: 'Désinfection EFS & ECS', texte: "En préventif après travaux neufs ou en curatif, selon les protocoles définis par l'ARS. Concentrations, temps de contact et rinçage sont contrôlés par analyse, puis validés par un laboratoire accrédité COFRAC.", points: ['Protocoles ARS', 'Chlore ou peroxyde d\'hydrogène', 'Laboratoire COFRAC'], lien: '#prestations', lienTxt: 'Voir le déroulé' },
      { label: "Protéger l'eau chaude sanitaire", titre: 'Dosage et chloration', texte: "Pompe doseuse pour injection de filmogène, panneau de chloration : nous fournissons, mettons en service et entretenons ces équipements.", points: ['Pompe doseuse filmogène', 'Panneau de chloration', 'Entretien'], lien: '#domaines', lienTxt: 'Voir le domaine', domaine: 'tertiaire' }
    ] },
    { id: 'industrie', label: 'Un industriel', icon: 'i-factory', form: 'Un industriel', besoins: [
      { label: 'Une eau de process adaptée', titre: 'À chaque besoin son eau de process', texte: "Filtre, antitartre, adoucisseur, osmoseur, filtre à barreau magnétique : nous proposons les solutions et les services adaptés à votre process.", points: ['Adoucisseur, osmoseur', 'Filtre à barreau magnétique', 'Assistance réactive'], lien: '#domaines', lienTxt: 'Voir le domaine', domaine: 'industrie' },
      { label: "L'entretien d'une installation", titre: 'Maintenance industrielle', texte: "Adoucisseurs TWIN ou DUPLEX, osmoseurs, eau déminéralisée : nous assurons l'entretien de vos installations de traitement d'eau.", points: ['TWIN ou DUPLEX', 'Osmoseur', 'Eau déminéralisée'], lien: '#prestations', lienTxt: "Voir l'entretien" }
    ] }
  ];

  var fp = $('#finder-profils'), fb = $('#finder-besoins'), fr = $('#finder-resultat');
  var current = { profil: null, besoin: null };

  function chip(html, pressed) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.innerHTML = html;
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    return b;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function showResult(p, b) {
    current = { profil: p, besoin: b };
    fr.innerHTML =
      '<div class="result"><div>' +
      '<p class="result__k">Notre réponse</p><h3>' + esc(b.titre) + '</h3><p>' + esc(b.texte) + '</p>' +
      '<ul class="result__pts">' + b.points.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="result__cta">' +
      '<a class="btn btn--primary" href="#contact" data-finder>Être conseillé<svg class="ico"><use href="#i-arrow"/></svg></a>' +
      '<a class="btn btn--ghost" href="' + b.lien + '"' + (b.domaine ? ' data-domaine="' + b.domaine + '"' : '') + '>' + esc(b.lienTxt) + '</a>' +
      '</div></div>';
  }
  function showBesoins(p, auto) {
    fb.innerHTML = '';
    p.besoins.forEach(function (b, i) {
      var c = chip(esc(b.label), i === 0);
      c.style.setProperty('--i', i);
      c.addEventListener('click', function () {
        $$('.chip', fb).forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
        showResult(p, b);
      });
      fb.appendChild(c);
    });
    showResult(p, p.besoins[0]);
  }
  if (fp && fb && fr) {
    FINDER.forEach(function (p, i) {
      var c = chip('<svg class="ico"><use href="#' + p.icon + '"/></svg>' + esc(p.label), i === 0);
      c.addEventListener('click', function () {
        $$('.chip', fp).forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
        showBesoins(p);
      });
      fp.appendChild(c);
    });
    showBesoins(FINDER[0]);
    fr.addEventListener('click', function (e) {
      if (!e.target.closest('[data-finder]') || !current.besoin) return;
      prefill(current.besoin.label + ' (' + current.besoin.titre + ')', current.profil.form);
    });
  }

  /* ---------- simulateur de dureté ---------- */
  var th = $('#th'), cible = $('#cible');
  if (th && cible) {
    var CLASSES = [
      { max: 7, nom: 'très douce', msg: "Votre eau est naturellement très douce : un adoucisseur n'est pas nécessaire." },
      { max: 15, nom: 'douce', msg: "Votre eau est douce : le tartre reste limité." },
      { max: 25, nom: 'moyennement dure', msg: "Le tartre commence à se déposer, surtout dans les appareils qui chauffent l'eau. Un conseil s'impose." },
      { max: 42, nom: 'dure', msg: "Votre eau est dure : le tartre s'installe dans les canalisations et les appareils. Un adoucisseur protège votre installation." },
      { max: 999, nom: 'très dure', msg: "Votre eau est très dure : sans traitement, l'entartrage est rapide. Un adoucisseur est vivement conseillé." }
    ];
    var eau = $('#pipe-eau'), tartre = $('#pipe-tartre');
    var updateSim = function (e) {
      var t = +th.value, c = +cible.value;
      if (c > t) { if (e && e.target === cible) { t = c; th.value = t; } else { c = t; cible.value = c; } }
      var k = CLASSES.filter(function (x) { return t < x.max; })[0] || CLASSES[CLASSES.length - 1];
      $('#th-val').textContent = t + ' °f';
      $('#cible-val').textContent = c + ' °f';
      $('#sim-classe').textContent = k.nom;
      $('#sim-msg').textContent = k.msg;
      $('#sim-sodium').textContent = Math.round((t - c) * 4.6).toLocaleString('fr-FR');
      cible.style.setProperty('--p', (c / 50 * 100) + '%');
      // le tartre épaissit, le passage de l'eau rétrécit
      var r = 116 - (t / 50) * 74;
      eau.setAttribute('r', r.toFixed(1));
      tartre.style.fill = t < 15 ? '#f1eadb' : t < 25 ? '#eadfc6' : t < 42 ? '#e0cfa8' : '#d3bb8a';
    };
    th.addEventListener('input', updateSim);
    cible.addEventListener('input', updateSim);
    updateSim();
  }

  /* ---------- comparateur CLACK ---------- */
  var rows = $$('.clack__row');
  function setClack(row) {
    rows.forEach(function (r) { r.classList.toggle('is-active', r === row); });
    $('#clack-bar').style.width = (+row.dataset.debit / 26 * 100) + '%';
    $('#clack-debit').textContent = row.dataset.debit.replace('.', ',') + ' m³/h';
    $('#clack-resine').textContent = row.dataset.resine;
  }
  rows.forEach(function (r) {
    r.addEventListener('click', function () { setClack(r); });
    r.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') setClack(r); });
    r.addEventListener('focus', function () { setClack(r); });
  });

  /* ---------- quiz vrai / faux ---------- */
  var cards = $$('.vf[data-rep]'), score = 0, done = 0, scoreEl = $('#quiz-score');
  cards.forEach(function (card) {
    var rep = card.dataset.rep;
    var btns = document.createElement('div');
    btns.className = 'vf__btns';
    btns.innerHTML = '<button type="button" class="vf__btn" data-v="vrai">Vrai</button><button type="button" class="vf__btn" data-v="faux">Faux</button>';
    var verdict = document.createElement('p');
    verdict.className = 'vf__verdict';
    card.insertBefore(btns, $('.vf__exp', card));
    card.insertBefore(verdict, $('.vf__exp', card));
    btns.addEventListener('click', function (e) {
      var b = e.target.closest('.vf__btn');
      if (!b || card.classList.contains('is-open')) return;
      var ok = b.dataset.v === rep;
      if (ok) score++;
      done++;
      verdict.innerHTML = '<svg class="ico"><use href="#' + (rep === 'vrai' ? 'i-check' : 'i-cross') + '"/></svg>' + (rep === 'vrai' ? 'Vrai' : 'Faux') + '<i>· ' + (ok ? 'bien vu !' : 'idée reçue…') + '</i>';
      card.classList.add('is-open');
      if (scoreEl) scoreEl.innerHTML = '<b>' + score + '</b> / ' + cards.length + ' bonnes réponses' + (done === cards.length ? (score === cards.length ? ' · sans faute, bravo !' : ' · test terminé') : '');
      if (hasGsap) setTimeout(function () { ScrollTrigger.refresh(); }, 650);
    });
  });

  /* ---------- carte chargée au clic ---------- */
  var carteBtn = $('#carte-btn');
  if (carteBtn) carteBtn.addEventListener('click', function () {
    var f = document.createElement('iframe');
    f.title = 'Carte : H2O Partner, 134 chemin du Randan, 38590 Sillans';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer';
    f.src = 'https://www.openstreetmap.org/export/embed.html?bbox=5.3300%2C45.3200%2C5.4500%2C45.3700&layer=mapnik';
    $('#carte').replaceChildren(f);
  });

  /* ---------- formulaire (ouvre la messagerie) ---------- */
  function prefill(sujet, profil) {
    var s = $('#f-sujet'), p = $('#f-profil');
    if (s && sujet) s.value = sujet;
    if (p && profil) p.value = profil;
  }
  var form = $('#form-contact');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#form-err'), bad = null;
    $$('[required]', form).forEach(function (f) {
      var ko = !f.value.trim() || (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()));
      f.classList.toggle('is-invalid', ko);
      f.setAttribute('aria-invalid', ko ? 'true' : 'false');
      if (ko && !bad) bad = f;
    });
    if (bad) {
      err.hidden = false;
      err.textContent = bad.type === 'email' ? 'Merci de vérifier votre adresse e-mail.' : 'Merci de compléter les champs obligatoires.';
      bad.focus();
      return;
    }
    err.hidden = true;
    var v = function (id) { return $('#' + id).value.trim(); };
    var sujet = v('f-sujet') || 'Demande depuis le site';
    var corps = [v('f-msg'), '', '--', v('f-nom'), $('#f-profil').value, v('f-tel') ? 'Tél. : ' + v('f-tel') : '', 'E-mail : ' + v('f-email')]
      .filter(function (l, i) { return l !== '' || i === 1; }).join('\n');
    window.location.href = 'mailto:commercial@h2o-partner.fr?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(corps);
  });
  $$('#form-contact [required]').forEach(function (f) {
    f.addEventListener('input', function () { f.classList.remove('is-invalid'); f.removeAttribute('aria-invalid'); });
  });

  /* ---------- divers ---------- */
  var an = $('#annee');
  if (an) an.textContent = new Date().getFullYear();

  // arrivée sur une ancre (#contact…) : repositionner une fois les polices et images chargées
  window.addEventListener('load', function () {
    if (hasGsap) ScrollTrigger.refresh();
    if (location.hash.length > 1) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) setTimeout(function () { scrollToEl(t); }, 80);
    }
  });
})();
