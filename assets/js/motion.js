/* H2O Partner V2 — couche de mouvement (GSAP 3, ScrollTrigger, SplitText, Lenis, en local)
   Voir motion.css pour la règle des trois niveaux. Sans ces librairies, ou avec
   « réduire les animations », la page reste complète et immobile. */
(function () {
  'use strict';

  var html = document.documentElement;
  var capture = /capture/.test(location.search);
  var reduce = capture || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var done = function () { html.classList.remove('m-enter'); };

  if (!window.gsap || !window.ScrollTrigger) { done(); return; }
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);

  var EASE = 'expo.out';      /* proche de cubic-bezier(.22,1,.36,1) : se pose sans rebondir */
  var header = document.querySelector('.site-header');

  /* ---------- Défilement doux : léger, souris et pavé seulement ---------- */
  var lenis = null;
  if (!reduce && fine && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true, anchors: { offset: -96 } });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    var burger = document.querySelector('.burger');
    if (burger) burger.addEventListener('click', function () {
      setTimeout(function () { document.body.classList.contains('menu-open') ? lenis.stop() : lenis.start(); }, 0);
    });
  }

  /* ---------- En-tête : se range en descendant, revient en remontant ---------- */
  if (header) {
    ST.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var y = self.scroll();
        header.classList.toggle('is-hidden', !reduce && self.direction === 1 && y > 360);
        if (self.direction === -1 || y < 360) header.classList.remove('is-hidden');
      }
    });
  }

  /* ---------- Menu téléphone : ordre d'arrivée des liens ---------- */
  document.querySelectorAll('.menu a, .menu-foot').forEach(function (el, i) { el.style.setProperty('--i', i); });

  /* ---------- 1. Entrée du haut de page ---------- */
  var hero = document.querySelector('.hero');
  function enter() {
    if (!hero || reduce) { done(); return; }
    var h1 = hero.querySelector('h1');
    var rest = gsap.utils.toArray(hero.querySelectorAll('.hero-text > :not(h1)'));
    var rule = hero.querySelector('.hero-rule');
    var ticks = rule ? rule.querySelectorAll('.tick') : [];
    var photo = hero.querySelector('.hero-photo img');
    var split = null;
    if (h1 && window.SplitText) {
      split = window.SplitText.create(h1, { type: 'lines', mask: 'lines', linesClass: 'm-line' });
      gsap.set(split.lines, { yPercent: 110 });
    }
    gsap.set(rest, { autoAlpha: 0, y: 12 });
    if (rule) gsap.set(rule, { autoAlpha: 0 });
    done();
    var tl = gsap.timeline({ defaults: { ease: EASE } });
    if (split) tl.to(split.lines, { yPercent: 0, duration: .9, stagger: .08 }, 0);
    tl.to(rest, { autoAlpha: 1, y: 0, duration: .6, stagger: .06, clearProps: 'transform,opacity,visibility' }, .35);
    if (rule) {
      tl.to(rule, { autoAlpha: 1, duration: .4, clearProps: 'opacity,visibility' }, .45);
      tl.from(ticks, { scaleX: 0, transformOrigin: 'left', duration: .6, stagger: .05, clearProps: 'transform' }, .45);
    }
    if (photo) tl.fromTo(photo, { scale: 1.06 }, { scale: 1, duration: 1.6, clearProps: 'transform' }, 0);
    if (split) tl.add(function () { split.revert(); });
  }
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 600); })]).then(enter);

  /* ---------- Photos qui se révèlent par un masque, une fois ---------- */
  gsap.utils.toArray('.reveal').forEach(function (fig) {
    var img = fig.querySelector('img');
    if (!img || img.closest('.chapters')) return;
    var frame = document.createElement('span');
    frame.className = 'm-frame';
    img.parentNode.insertBefore(frame, img);
    frame.appendChild(img);
    if (reduce) return;
    gsap.fromTo(img,
      { clipPath: 'inset(0% 0% 100% 0%)', scale: 1.12 },
      { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.3, ease: EASE, clearProps: 'clipPath,transform',
        scrollTrigger: { trigger: frame, start: 'top 88%', once: true } });
  });

  /* ---------- Chiffres qui comptent (25 ans, 5 ans) ---------- */
  gsap.utils.toArray('[data-count]').forEach(function (el) {
    if (reduce) return;
    var end = +el.getAttribute('data-count');
    var o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, { v: end, duration: 1.1, ease: 'power2.out',
      onUpdate: function () { el.textContent = Math.round(o.v); },
      scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  /* ---------- 2a. Temps fort : la règle graduée qui suit les étapes ---------- */
  gsap.utils.toArray('.steps').forEach(function (list) {
    list.classList.add('is-live');
    var fill = document.createElement('span');
    fill.className = 'steps-fill';
    fill.setAttribute('aria-hidden', 'true');
    list.appendChild(fill);
    var items = list.querySelectorAll(':scope > li');
    if (reduce) {
      gsap.set(fill, { scaleY: 1 });
      items.forEach(function (li) { li.classList.add('is-on'); });
      return;
    }
    gsap.to(fill, { scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: list, start: 'top 62%', end: 'bottom 62%', scrub: .6 } });
    items.forEach(function (li) {
      ST.create({ trigger: li, start: 'top 62%', end: 'max',
        onToggle: function (self) { li.classList.toggle('is-on', self.isActive); } });
    });
  });

  /* ---------- 2b. Temps fort : la citation dont les mots s'allument ---------- */
  if (window.SplitText) {
    gsap.utils.toArray('.quote p').forEach(function (p) {
      if (reduce) return;
      var split = window.SplitText.create(p, { type: 'words', wordsClass: 'm-word' });
      gsap.to(split.words, { color: '#0E1B3D', stagger: .1, ease: 'none',
        scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 50%', scrub: .5 } });
    });
  }

  /* ---------- 2c. Temps fort : les quatre métiers, photo fixe qui change ---------- */
  var chapters = document.querySelector('.chapters');
  if (chapters) {
    var media = chapters.querySelector('.chapters-media');
    var arts = chapters.querySelectorAll('.terrain');
    var imgs = [];
    var count = document.createElement('div');
    count.className = 'chapters-count';
    arts.forEach(function (art, i) {
      var src = art.querySelector('figure img');
      if (!src) return;
      var img = src.cloneNode(true);
      img.alt = '';
      img.loading = 'lazy';
      img.sizes = '(min-width: 1000px) 40vw, 100vw';
      if (i === 0) img.classList.add('is-on');
      media.appendChild(img);
      imgs.push(img);
      count.appendChild(document.createElement('i'));
    });
    media.appendChild(count);
    var marks = count.querySelectorAll('i');
    if (marks[0]) marks[0].classList.add('is-on');
    var current = 0;
    var show = function (i) {
      if (i === current || !imgs[i]) return;
      imgs.forEach(function (im, k) { im.classList.toggle('is-under', k === current); im.classList.remove('is-on'); });
      imgs[i].classList.add('is-on');
      marks.forEach(function (m, k) { m.classList.toggle('is-on', k === i); });
      current = i;
    };
    gsap.matchMedia().add('(min-width: 1000px)', function () {
      chapters.classList.add('is-live');
      arts.forEach(function (art, i) {
        ST.create({ trigger: art, start: 'top 55%', end: 'bottom 55%',
          onToggle: function (self) { if (self.isActive) show(i); } });
      });
      return function () { chapters.classList.remove('is-live'); };
    });
  }

  /* ---------- Le Mont Aiguille glisse doucement derrière la carte (image seule) ---------- */
  var local = document.querySelector('.local');
  if (local && !reduce) {
    gsap.matchMedia().add('(min-width: 901px)', function () {
      var bg = local.querySelector('.local-bg');
      gsap.set(bg, { height: '118%', top: '-9%' });
      gsap.fromTo(bg, { yPercent: -6 }, { yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: local, start: 'top bottom', end: 'bottom top', scrub: true } });
      return function () { gsap.set(bg, { clearProps: 'height,top' }); };
    });
  }

  /* ---------- Jauge °f : où l'on en est dans la page (grands écrans) ---------- */
  if (!reduce) {
    var gauge = document.createElement('div');
    gauge.className = 'gauge';
    gauge.setAttribute('aria-hidden', 'true');
    gauge.innerHTML = '<span class="gauge-cursor"></span>';
    document.body.appendChild(gauge);
    var cursor = gauge.firstChild;
    ST.create({ start: 0, end: 'max',
      onUpdate: function (self) {
        gsap.set(cursor, { y: self.progress * gauge.clientHeight });
        gauge.classList.toggle('is-shown', self.scroll() > window.innerHeight * .6);
      } });
  }

  /* Les images et les polices changent les hauteurs : on recalcule une fois tout chargé */
  window.addEventListener('load', function () { ST.refresh(); });
})();
