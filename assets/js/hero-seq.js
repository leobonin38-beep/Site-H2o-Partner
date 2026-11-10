/* ==========================================================
   Accueil : séquence vidéo pilotée par le défilement.
   La vidéo (une goutte traverse les nuages puis rejoint les
   tuyaux en verre) est découpée en images. Le défilement choisit
   l'image à afficher : c'est fluide dans les deux sens, ce qu'une
   balise <video> ne permet pas.
   À la fin, la dernière image se fond dans la scène 3D en direct
   (hero3d.js), qui représente exactement les mêmes tuyaux.

   Images : assets/img/seq/{d|m}/f000.webp … (d = ordinateur, m = téléphone)
   Réglages : attributs data-frames et data-pad de la section .hero.
   ========================================================== */
(function () {
  'use strict';

  var hero = document.querySelector('.hero[data-frames]');
  var canvas = document.getElementById('seq');
  if (!hero || !canvas || !canvas.getContext) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // accueil fixe, image d'affiche

  var ctx = canvas.getContext('2d');
  var COUNT = +hero.dataset.frames;
  var small = Math.min(window.innerWidth, window.innerHeight) < 600;
  var dir = 'assets/img/seq/' + (small ? 'm' : 'd') + '/';
  var frames = new Array(COUNT);
  var panels = Array.prototype.slice.call(hero.querySelectorAll('[data-panel]'));
  var hint = hero.querySelector('.hero__hint');

  // Découpage du défilement (0 = haut de l'accueil, 1 = fin de la zone fixée)
  var SEQ_START = 0.03, SEQ_END = 0.84;   // la vidéo se déroule entre ces deux points
  var MIX_START = 0.84, MIX_END = 0.95;   // fondu vers la scène 3D en direct
  var WINDOWS = [                          // apparition et disparition des textes
    { a: -1, b: -1, c: 0.10, d: 0.19 },
    { a: 0.27, b: 0.35, c: 0.56, d: 0.64 },
    { a: 0.80, b: 0.89, c: 2, d: 2 }
  ];

  hero.classList.add('has-seq');

  function src(i) { return dir + 'f' + ('00' + i).slice(-3) + '.webp'; }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  /* ---------- chargement progressif : d'abord 1 image sur 8, puis de plus en plus fin ---------- */
  var order = [], seen = {};
  [8, 4, 2, 1].forEach(function (step) {
    for (var i = 0; i < COUNT; i += step) if (!seen[i]) { seen[i] = 1; order.push(i); }
  });
  if (!seen[COUNT - 1]) order.splice(1, 0, COUNT - 1);
  var cursor = 0, active = 0, drawn = -1, wanted = 0;

  function pump() {
    while (active < 6 && cursor < order.length) {
      (function (i) {
        var img = new Image();
        active++;
        img.decoding = 'async';
        img.onload = function () { frames[i] = img; active--; if (nearest(wanted) === i) draw(true); pump(); };
        img.onerror = function () { active--; pump(); };
        img.src = src(i);
      })(order[cursor++]);
    }
  }

  function nearest(i) { // image chargée la plus proche de celle demandée
    if (frames[i]) return i;
    for (var d = 1; d < COUNT; d++) {
      if (i - d >= 0 && frames[i - d]) return i - d;
      if (i + d < COUNT && frames[i + d]) return i + d;
    }
    return -1;
  }

  /* ---------- dessin (l'image couvre toute la zone, comme object-fit: cover) ---------- */
  // En portrait, l'image est très rognée sur les côtés : on centre sur la goutte au début,
  // puis on glisse vers la vanne (0.8, même valeur que dans hero3d.js) quand les tuyaux apparaissent.
  var FOCUS_PORTRAIT = 0.8, focus = 0.5, drawnFocus = -1;
  var cw = 0, ch = 0;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = Math.round(canvas.clientWidth * dpr); ch = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    draw(true);
  }
  function draw(force) {
    var i = nearest(wanted);
    if (i < 0 || (!force && i === drawn && focus === drawnFocus)) return;
    var img = frames[i];
    var s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    var w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) * focus, (ch - h) / 2, w, h);
    drawn = i; drawnFocus = focus;
    canvas.classList.add('is-on');
  }

  /* ---------- défilement ---------- */
  var lastMix = -1;
  function update() {
    var range = hero.offsetHeight - window.innerHeight;
    var p = range > 0 ? Math.max(0, Math.min(1, window.scrollY / range)) : 0;

    wanted = Math.round(Math.max(0, Math.min(1, (p - SEQ_START) / (SEQ_END - SEQ_START))) * (COUNT - 1));
    focus = window.innerWidth < window.innerHeight ? 0.5 + (FOCUS_PORTRAIT - 0.5) * smooth(0.5, SEQ_END, p) : 0.5;
    draw(false);

    var mix = smooth(MIX_START, MIX_END, p);
    if (mix !== lastMix) {
      lastMix = mix;
      hero.style.setProperty('--mix', mix.toFixed(3));
      hero.dataset.mix = mix > 0.001 ? '1' : '0';   // hero3d.js ne calcule la 3D que si elle est visible
      hero.dataset.live = mix > 0.999 ? '1' : '0';  // … et ne suit le pointeur qu'une fois le fondu terminé
    }

    if (hint) hint.style.opacity = (1 - smooth(0.04, 0.12, p)).toFixed(3);

    panels.forEach(function (el, k) {
      var w = WINDOWS[k]; if (!w) return;
      var o = Math.min(w.a < 0 ? 1 : smooth(w.a, w.b, p), 1 - (w.c > 1 ? 0 : smooth(w.c, w.d, p)));
      var y = (w.a >= 0 && p < w.b) ? (1 - o) * 40 : -(1 - o) * 40;
      el.style.opacity = o.toFixed(3);
      el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
      var off = o < 0.05;
      if (off !== el.hasAttribute('inert')) { if (off) el.setAttribute('inert', ''); else el.removeAttribute('inert'); }
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }

  resize();
  update();
  pump();
  window.addEventListener('scroll', onScroll, { passive: true });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { resize(); update(); }, 100); });
})();
