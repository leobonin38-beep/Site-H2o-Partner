/* H2O Partner V2 — accueil : règle de dureté, révélations d'images, compteurs */
(function () {
  'use strict';

  var capture = /capture/.test(location.search);
  if (capture) document.documentElement.classList.add('capture');
  var reduce = capture || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    function classer(v) {
      for (var i = 0; i < CLASSES.length; i++) if (v < CLASSES[i].max) return CLASSES[i].label;
      return CLASSES[CLASSES.length - 1].label;
    }
    function maj() {
      var d = +th.value, c = Math.min(+cible.value, d);
      if (+cible.value > d) cible.value = d;
      thOut.textContent = d;
      cibleOut.textContent = c;
      classe.textContent = classer(d);
      sodium.textContent = Math.round((d - c) * SODIUM_PAR_DEGRE);
    }
    th.addEventListener('input', maj);
    cible.addEventListener('input', maj);
    maj();
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

  /* Chiffres qui comptent (25 ans, 5 ans) */
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

  /* Menu téléphone : simple repli, la maquette n'a qu'une page */
  var burger = document.querySelector('.burger');
  if (burger) burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    document.body.classList.toggle('menu-open', !open);
  });
})();
