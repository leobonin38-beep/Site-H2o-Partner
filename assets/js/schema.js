/* ==========================================================
   Schéma animé de l'adoucisseur (canvas 2D).
   window.H2OSchema.setStep(n) met en avant l'étape n (0 à 3) :
   0 arrivée d'eau dure · 1 échange dans la résine
   2 eau adoucie vers la maison · 3 régénération au sel
   ========================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('schema');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var W = 440, H = 520;                 // repère de dessin
  var CX = 150;                         // axe de la bouteille
  var TANK = { x: 95, y: 124, w: 110, h: 322 };
  var RESIN_TOP = 196, RESIN_BOT = 432;
  var HEAD = { x: 116, y: 58, w: 68, h: 68 };
  var SALT = { x: 286, y: 306, w: 116, h: 140 };
  var IN_Y = 96, OUT_Y = 96, DRAIN_Y = 72, BRINE_Y = 114, BRINE_X = 302;

  var C_HARD = [255, 179, 71], C_SOFT = [127, 220, 240], C_SALT = [255, 255, 255];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var step = 0, glow = [1, 0, 0, 0];    // intensité de mise en avant de chaque étape
  var particles = [];

  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }

  // --- trajets -------------------------------------------------
  function path(points) {
    var len = [0];
    for (var i = 1; i < points.length; i++) {
      len.push(len[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    }
    return { pts: points, len: len, total: len[len.length - 1] };
  }
  function at(p, d) {
    var L = p.len, i = 1;
    while (i < L.length - 1 && L[i] < d) i++;
    var t = (d - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
    t = Math.max(0, Math.min(1, t));
    return [lerp(p.pts[i - 1][0], p.pts[i][0], t), lerp(p.pts[i - 1][1], p.pts[i][1], t)];
  }
  function lane() { // colonne de descente dans la résine, hors tube central
    var side = Math.random() < 0.5 ? -1 : 1;
    return CX + side * (14 + Math.random() * 32);
  }
  function servicePath() {
    var x = lane();
    return path([[0, IN_Y], [HEAD.x + 6, IN_Y], [x, 140], [x, RESIN_BOT - 6], [CX, RESIN_BOT + 6], [CX, OUT_Y], [W + 10, OUT_Y]]);
  }
  function regenPath() {
    var x = lane();
    return path([[BRINE_X, SALT.y + 30], [BRINE_X, BRINE_Y], [HEAD.x + HEAD.w - 6, BRINE_Y], [x, 140], [x, RESIN_BOT - 6], [CX, RESIN_BOT + 6], [CX, DRAIN_Y], [W + 10, DRAIN_Y]]);
  }

  function spawn(regen, ahead) {
    var p = regen ? regenPath() : servicePath();
    particles.push({ p: p, a: regen ? 3 : 2, d: ahead ? Math.random() * p.total : 0, v: 62 + Math.random() * 26, regen: regen, r: 2.6 + Math.random() * 1.4, ph: Math.random() * 6.28 });
  }

  // --- décor (dessiné une fois hors écran) ---------------------
  var bg = document.createElement('canvas');
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function pipe(c, pts, width, color) {
    c.lineWidth = width; c.strokeStyle = color; c.lineCap = 'butt'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }
  function buildBackground(scale) {
    bg.width = W * scale; bg.height = H * scale;
    var c = bg.getContext('2d');
    c.setTransform(scale, 0, 0, scale, 0, 0);

    // tuyaux
    var PIPE = 'rgba(190,215,245,.28)', EDGE = 'rgba(220,235,255,.55)';
    [[[0, IN_Y], [HEAD.x, IN_Y]], [[HEAD.x + HEAD.w, OUT_Y], [W, OUT_Y]]].forEach(function (pts) {
      pipe(c, pts, 18, EDGE); pipe(c, pts, 14, 'rgba(20,45,120,.9)'); pipe(c, pts, 14, PIPE);
    });
    var drain = [[HEAD.x + HEAD.w, DRAIN_Y], [W, DRAIN_Y]];
    pipe(c, drain, 9, EDGE); pipe(c, drain, 6, 'rgba(20,45,120,.9)'); pipe(c, drain, 6, PIPE);
    var brine = [[BRINE_X, SALT.y + 30], [BRINE_X, BRINE_Y], [HEAD.x + HEAD.w, BRINE_Y]];
    pipe(c, brine, 7, EDGE); pipe(c, brine, 4.5, 'rgba(20,45,120,.9)'); pipe(c, brine, 4.5, PIPE);

    // bac à sel
    roundRect(c, SALT.x, SALT.y, SALT.w, SALT.h, 14);
    c.fillStyle = 'rgba(235,244,255,.14)'; c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(235,244,255,.6)'; c.stroke();
    c.save(); roundRect(c, SALT.x, SALT.y, SALT.w, SALT.h, 14); c.clip();
    c.fillStyle = 'rgba(127,220,240,.22)'; c.fillRect(SALT.x, SALT.y + 62, SALT.w, SALT.h);
    c.fillStyle = 'rgba(255,255,255,.85)';
    for (var s = 0; s < 46; s++) { // pastilles de sel
      var sx = SALT.x + 10 + ((s * 37) % (SALT.w - 22)), sy = SALT.y + SALT.h - 10 - ((s * 53) % 52);
      roundRect(c, sx, sy, 9, 6, 2.5); c.fill();
    }
    c.restore();

    // bouteille de résine
    var g = c.createLinearGradient(TANK.x, 0, TANK.x + TANK.w, 0);
    g.addColorStop(0, 'rgba(40,110,215,.75)'); g.addColorStop(.45, 'rgba(70,150,235,.5)'); g.addColorStop(1, 'rgba(25,75,170,.8)');
    roundRect(c, TANK.x, TANK.y, TANK.w, TANK.h, 34);
    c.fillStyle = g; c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(190,225,255,.7)'; c.stroke();

    // billes de résine
    c.save(); roundRect(c, TANK.x + 3, TANK.y + 3, TANK.w - 6, TANK.h - 6, 31); c.clip();
    for (var y = RESIN_TOP; y < TANK.y + TANK.h; y += 7) {
      for (var x = TANK.x + 4 + ((y / 7) % 2) * 3.5; x < TANK.x + TANK.w - 2; x += 7) {
        var j = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; j -= Math.floor(j);
        c.beginPath(); c.arc(x + j * 1.6, y + j * 1.2, 2.7, 0, 6.2832);
        c.fillStyle = 'rgba(' + (236 + j * 18 | 0) + ',' + (176 + j * 30 | 0) + ',' + (72 + j * 30 | 0) + ',' + (0.62 + j * 0.25) + ')';
        c.fill();
      }
    }
    c.restore();

    // tube central
    c.fillStyle = 'rgba(12,30,90,.72)'; c.fillRect(CX - 6, TANK.y + 6, 12, RESIN_BOT + 8 - TANK.y);
    c.strokeStyle = 'rgba(200,228,255,.55)'; c.lineWidth = 1.2;
    c.strokeRect(CX - 6, TANK.y + 6, 12, RESIN_BOT + 8 - TANK.y);

    // reflet
    c.fillStyle = 'rgba(255,255,255,.12)';
    roundRect(c, TANK.x + 10, TANK.y + 26, 9, TANK.h - 70, 5); c.fill();
  }

  function drawHead(c) {
    var g = c.createLinearGradient(0, HEAD.y, 0, HEAD.y + HEAD.h);
    g.addColorStop(0, '#3b4a6b'); g.addColorStop(1, '#1b2540');
    roundRect(c, HEAD.x, HEAD.y, HEAD.w, HEAD.h, 12);
    c.fillStyle = g; c.fill();
    c.lineWidth = 1.5; c.strokeStyle = 'rgba(200,225,255,.6)'; c.stroke();
    roundRect(c, HEAD.x + 12, HEAD.y + 10, HEAD.w - 24, 22, 5);
    c.fillStyle = step === 3 ? '#ffd9a0' : '#9fe8f7'; c.fill();
    c.fillStyle = '#12224f'; c.font = '600 10px Outfit, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(step === 3 ? 'RÉGÉN.' : 'SERVICE', HEAD.x + HEAD.w / 2, HEAD.y + 21.5);
  }

  function label(text, x, y, k, align) {
    ctx.font = '600 13px Outfit, sans-serif';
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    var a = 0.45 + 0.55 * k;
    var w = ctx.measureText(text).width + 18;
    var bx = align === 'right' ? x - w + 9 : align === 'center' ? x - w / 2 : x - 9;
    roundRect(ctx, bx, y - 12, w, 24, 12);
    ctx.fillStyle = 'rgba(9,20,66,' + (0.55 + 0.35 * k) + ')'; ctx.fill();
    ctx.strokeStyle = 'rgba(127,220,240,' + (0.15 + 0.75 * k) + ')'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
    ctx.fillText(text, x, y + 0.5);
  }

  function halo(x, y, rx, ry, k, color) {
    if (k < 0.02) return;
    var g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    g.addColorStop(0, rgba(color, 0.42 * k)); g.addColorStop(1, rgba(color, 0));
    ctx.save(); ctx.translate(x, y); ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); ctx.translate(-x, -y);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, Math.max(rx, ry), 0, 6.2832); ctx.fill(); ctx.restore();
  }

  // --- rendu ---------------------------------------------------
  var scale = 1, last = 0, t = 0, acc = 0;

  function resize() {
    var cssW = canvas.clientWidth || W;
    scale = Math.min(window.devicePixelRatio || 1, 2) * (cssW / W);
    canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
    buildBackground(scale);
  }

  function update(dt) {
    t += dt;
    for (var i = 0; i < 4; i++) glow[i] += ((i === step ? 1 : 0) - glow[i]) * Math.min(1, dt * 5);
    var regenMode = step === 3;
    acc += dt;
    var every = regenMode ? 0.16 : 0.1;
    while (acc > every) { acc -= every; if (particles.length < 110) spawn(regenMode, false); }
    for (var k = particles.length - 1; k >= 0; k--) {
      var q = particles[k];
      // les particules de l'autre mode accélèrent pour laisser la place
      q.d += q.v * dt * (q.regen !== regenMode ? 2.6 : 1);
      if (q.d > q.p.total) particles.splice(k, 1);
    }
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    halo(50, IN_Y, 90, 46, glow[0], C_HARD);
    halo(CX, 310, 110, 170, glow[1], [255, 205, 120]);
    halo(330, OUT_Y, 130, 46, glow[2], C_SOFT);
    halo(SALT.x + SALT.w / 2, SALT.y + 70, 100, 110, glow[3], C_SALT);

    ctx.drawImage(bg, 0, 0, W, H);

    for (var i = 0; i < particles.length; i++) {
      var q = particles[i], pos = at(q.p, q.d), x = pos[0], y = pos[1];
      var inResin = q.d >= q.p.len[q.a] && q.d <= q.p.len[q.a + 1];
      if (inResin) x += Math.sin(y * 0.09 + q.ph) * 2.2;
      var k = Math.max(0, Math.min(1, (y - RESIN_TOP) / 150));
      var past = q.d > q.p.len[q.a + 1];     // après la traversée de la résine
      var col, sq = false;
      if (!q.regen) col = past ? C_SOFT : mix(C_HARD, C_SOFT, inResin ? k : 0);
      else { col = past ? C_HARD : mix(C_SALT, C_HARD, inResin ? k : 0); sq = !past && !(inResin && k > 0.6); }
      // masqué sous la tête de vanne
      if (x > HEAD.x && x < HEAD.x + HEAD.w && y > HEAD.y && y < HEAD.y + HEAD.h) continue;
      var a = Math.min(1, q.d / 14, (q.p.total - q.d) / 14);
      ctx.fillStyle = rgba(col, 0.95 * a);
      if (sq) ctx.fillRect(x - q.r * 0.85, y - q.r * 0.85, q.r * 1.7, q.r * 1.7);
      else { ctx.beginPath(); ctx.arc(x, y, q.r, 0, 6.2832); ctx.fill(); }
    }

    drawHead(ctx);

    label("Arrivée d'eau dure", 12, IN_Y - 30, glow[0]);
    label('Résine', TANK.x - 6, 300, glow[1], 'right');
    label('Vers la maison', W - 12, OUT_Y + 30, glow[2], 'right');
    label('Bac à sel', SALT.x + SALT.w / 2, SALT.y + SALT.h + 22, glow[3], 'center');
    label('Égout', W - 12, DRAIN_Y - 26, glow[3], 'right');
  }

  var visible = false, raf = 0;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) { last = 0; return; }
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    update(dt); draw();
    raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf && !reduce) raf = requestAnimationFrame(frame); }

  function staticFrame() { // sans animation : une image représentative de l'étape
    particles.length = 0;
    for (var i = 0; i < 70; i++) spawn(step === 3, true);
    for (var j = 0; j < 4; j++) glow[j] = j === step ? 1 : 0;
    draw();
  }

  resize();
  for (var n = 0; n < 60; n++) spawn(false, true);
  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (reduce || !visible) draw(); });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); if (reduce) staticFrame(); else draw(); }, 150);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; wake(); }, { rootMargin: '100px' }).observe(canvas);
  } else { visible = true; wake(); }
  document.addEventListener('visibilitychange', wake);

  window.H2OSchema = {
    setStep: function (n) {
      n = Math.max(0, Math.min(3, n | 0));
      if (n === step) return;
      step = n;
      if (reduce) staticFrame();
    }
  };
})();
