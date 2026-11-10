/* ==========================================================
   Surface d'eau animée de l'accueil (WebGL, sans librairie).
   - reflets (caustiques) qui ondulent en continu
   - ondes circulaires qui partent du pointeur
   Si WebGL n'est pas disponible, le dégradé CSS reste affiché.
   ========================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('eau');
  if (!canvas) return;

  var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return;

  var MAX = 8; // nombre d'ondes simultanées

  var vert = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var frag = [
    'precision highp float;',
    'uniform vec2 uRes;uniform float uTime;',
    'uniform vec3 uRip[' + MAX + '];', // x, y (0..1), instant de départ
    'float caust(vec2 p,float t){',
    '  float c=0.;vec2 q=p;',
    '  for(int i=0;i<4;i++){',
    '    float f=float(i)+1.;',
    '    q+=vec2(sin(q.y*1.7+t*.55+f),cos(q.x*1.5-t*.45+f*1.3))*.42;',
    '    c+=1./(.35+abs(sin(q.x*1.3+f)+cos(q.y*1.2-f))*2.6);',
    '  }',
    '  return c/4.;',
    '}',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/uRes;',
    '  float asp=uRes.x/uRes.y;',
    '  vec2 p=vec2(uv.x*asp,uv.y);',
    // ondes du pointeur : déplacent légèrement la surface
    '  vec2 disp=vec2(0.);float glow=0.;',
    '  for(int i=0;i<' + MAX + ';i++){',
    '    vec3 r=uRip[i];float age=uTime-r.z;',
    '    if(age>0.&&age<3.2){',
    '      vec2 d=p-vec2(r.x*asp,r.y);float dist=length(d)+1e-4;',
    '      float front=age*.42;',
    '      float w=sin((dist-front)*38.)*exp(-abs(dist-front)*9.)*exp(-age*1.25);',
    '      disp+=d/dist*w*.035;glow+=abs(w)*.5;',
    '    }',
    '  }',
    '  vec2 q=p*3.2+disp*6.;',
    '  float c1=caust(q,uTime);',
    '  float c2=caust(q*1.7+4.,uTime*1.25);',
    '  float c=pow(c1*c2,1.6)*1.9;',
    // couleurs : bleu profond en bas à gauche, eau claire en haut à droite
    '  vec3 deep=vec3(.035,.075,.25);',
    '  vec3 mid=vec3(.06,.26,.62);',
    '  vec3 light=vec3(.25,.78,.93);',
    '  float g=smoothstep(-.1,1.25,uv.x*.62+uv.y*.6);',
    '  vec3 col=mix(deep,mid,g);',
    '  col+=light*min(c,1.4)*(.14+g*.42);',
    '  col+=vec3(.6,.95,1.)*glow*.4;',
    '  col*=.72+.28*smoothstep(1.35,.25,length(uv-vec2(.72,.6)));',
    '  gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = shader(gl.VERTEX_SHADER, vert);
  var fs = shader(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, 'uRes');
  var uTime = gl.getUniformLocation(prog, 'uTime');
  var uRip = gl.getUniformLocation(prog, 'uRip');

  var ripples = new Float32Array(MAX * 3);
  for (var i = 0; i < MAX; i++) ripples[i * 3 + 2] = -100;
  var next = 0;
  var start = performance.now();
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function now() { return (performance.now() - start) / 1000; }

  function addRipple(x, y) {
    ripples[next * 3] = x;
    ripples[next * 3 + 1] = y;
    ripples[next * 3 + 2] = now();
    next = (next + 1) % MAX;
  }

  function resize() {
    // résolution volontairement réduite : l'eau est floue par nature, et c'est bien plus léger
    var scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.6;
    var w = Math.max(2, Math.round(canvas.clientWidth * scale));
    var h = Math.max(2, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function draw() {
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, now());
    gl.uniform3fv(uRip, ripples);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  var visible = true, raf = 0;
  function loop() {
    raf = 0;
    if (!visible || document.hidden) return;
    draw();
    raf = requestAnimationFrame(loop);
  }
  function wake() { if (!raf && !reduce) raf = requestAnimationFrame(loop); }

  resize();
  draw();
  canvas.classList.add('is-on');
  window.addEventListener('resize', function () { resize(); if (reduce) draw(); });

  if (reduce) return; // image fixe uniquement

  var hero = canvas.parentElement;
  var lastX = -1, lastY = -1, lastT = 0;
  hero.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width;
    var y = 1 - (e.clientY - r.top) / r.height;
    var t = performance.now();
    var d = Math.hypot(x - lastX, y - lastY);
    if (d > 0.07 && t - lastT > 90) { addRipple(x, y); lastX = x; lastY = y; lastT = t; }
  }, { passive: true });
  hero.addEventListener('pointerdown', function (e) {
    var r = canvas.getBoundingClientRect();
    addRipple((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
  }, { passive: true });

  // quelques gouttes d'accueil, puis une goutte de temps en temps
  setTimeout(function () { addRipple(0.72, 0.55); }, 500);
  setTimeout(function () { addRipple(0.3, 0.35); }, 1300);
  setInterval(function () { if (visible && !document.hidden) addRipple(0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7); }, 4200);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; wake(); }).observe(canvas);
  }
  document.addEventListener('visibilitychange', wake);
  wake();
})();
