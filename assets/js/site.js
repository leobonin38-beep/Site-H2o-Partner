/* H2O Partner V2 — comportements communs : menu, révélations, compteurs, règle de dureté, vrai ou faux, contact */
(function () {
  'use strict';

  var capture = /capture/.test(location.search);
  if (capture) document.documentElement.classList.add('capture');
  var reduce = capture || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Menu téléphone */
  var burger = document.querySelector('.burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      document.body.classList.toggle('menu-open', !open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) burger.click();
    });
  }

  /* Images révélées par un masque, une fois */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Chiffres qui comptent */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduce) {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io2.unobserve(e.target);
        var el = e.target, end = +el.getAttribute('data-count'), t0 = null;
        function step(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / 900, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: .6 });
    counters.forEach(function (el) { io2.observe(el); });
  }

  /* Règle de dureté (logique reprise de la V1) */
  var CLASSES = [
    { max: 7, label: 'très douce' },
    { max: 15, label: 'douce' },
    { max: 25, label: 'moyennement dure' },
    { max: 35, label: 'dure' },
    { max: Infinity, label: 'très dure' }
  ];
  var SODIUM_PAR_DEGRE = 4.6; // mg/L par °f adouci
  var th = document.getElementById('th');
  var cible = document.getElementById('cible');
  if (th && cible) {
    var thOut = document.querySelector('#th-out b');
    var cibleOut = document.querySelector('#cible-out b');
    var classe = document.getElementById('th-classe');
    var sodium = document.getElementById('sodium');
    var classer = function (v) {
      for (var i = 0; i < CLASSES.length; i++) if (v < CLASSES[i].max) return CLASSES[i].label;
      return CLASSES[CLASSES.length - 1].label;
    };
    var maj = function () {
      var d = +th.value, c = Math.min(+cible.value, d);
      if (+cible.value > d) cible.value = d;
      thOut.textContent = d;
      cibleOut.textContent = c;
      classe.textContent = classer(d);
      sodium.textContent = Math.round((d - c) * SODIUM_PAR_DEGRE);
    };
    th.addEventListener('input', maj);
    cible.addEventListener('input', maj);
    maj();
  }

  /* Vrai ou faux (11 idées reçues, document UAE) */
  var quiz = document.querySelector('.quiz');
  if (quiz) {
    var items = quiz.querySelectorAll('li[data-rep]');
    var scoreEl = document.querySelector('.quiz-score b');
    var doneEl = document.querySelector('.quiz-score span');
    var score = 0, done = 0;
    items.forEach(function (li) {
      var rep = li.getAttribute('data-rep');
      var btns = li.querySelectorAll('.quiz-btns button');
      var a = li.querySelector('.quiz-a');
      var verdict = a.querySelector('b');
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          if (li.classList.contains('is-done')) return;
          var ok = b.getAttribute('data-v') === rep;
          li.classList.add('is-done');
          btns.forEach(function (x) { x.disabled = true; });
          b.classList.add('is-pick');
          a.classList.add(ok ? 'is-ok' : 'is-ko');
          verdict.textContent = (rep === 'vrai' ? 'Vrai' : 'Faux') + (ok ? ', bien vu.' : ', idée reçue.');
          done++; if (ok) score++;
          if (scoreEl) scoreEl.textContent = score;
          if (doneEl) doneEl.textContent = done;
        });
      });
    });
  }

  /* Contact : carte au clic, formulaire mailto */
  var mapBtn = document.querySelector('.map button');
  if (mapBtn) mapBtn.addEventListener('click', function () {
    var f = document.createElement('iframe');
    f.src = 'https://www.openstreetmap.org/export/embed.html?bbox=5.355%2C45.345%2C5.395%2C45.365&layer=mapnik&marker=45.355%2C5.375';
    f.title = 'Carte OpenStreetMap, Sillans';
    f.loading = 'lazy';
    mapBtn.parentNode.appendChild(f); mapBtn.remove();
  });
  var form = document.querySelector('.form');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ''; };
    var sujet = 'Site H2O Partner : ' + (g('objet') || 'demande de contact');
    var corps = 'Nom : ' + g('nom') + '\nTéléphone : ' + g('tel') + '\nE-mail : ' + g('email') + '\nVous êtes : ' + g('profil') + '\n\n' + g('message');
    location.href = 'mailto:commercial@h2o-partner.fr?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(corps);
  });
})();
