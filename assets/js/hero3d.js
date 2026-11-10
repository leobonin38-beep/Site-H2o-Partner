/* ==========================================================
   Accueil : réseau de tuyaux en verre où circule de l'eau (Three.js).
   - verre : reflets sur les bords (effet de Fresnel) et filet de lumière
   - eau : dégradé bleu, courants qui avancent, bulles qui suivent le flux
   - raccords chromés, vanne à volant rouge (couleur du logo)
   La scène suit doucement le pointeur et se déplace au défilement.
   Sans WebGL, le fond dégradé de l'accueil reste affiché.
   ========================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

const canvas = document.getElementById('scene3d');
const hero = canvas && canvas.closest('.hero');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas && hero) {
  try { init(); } catch (e) { /* pas de WebGL : le dégradé CSS suffit */ }
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  const rig = new THREE.Group();    // suit le pointeur et le défilement
  const world = new THREE.Group();  // composition (position selon le format d'écran)
  rig.add(world);
  scene.add(rig);

  /* ---------- matériaux ---------- */
  const uniforms = { uTime: { value: 0 } };

  const glassMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vN; varying vec3 vV;
      void main(){
        vec3 n = normalize(vN), v = normalize(vV);
        float f = pow(1. - abs(dot(n, v)), 2.6);
        float spec = pow(max(dot(reflect(-v, n), normalize(vec3(-.35,.85,.4))), 0.), 60.);
        float rim = pow(max(dot(n, normalize(vec3(.6,-.2,.3))), 0.), 6.) * .25;
        vec3 col = mix(vec3(.62,.86,1.), vec3(1.), clamp(spec*1.4 + f*.3, 0., 1.));
        gl_FragColor = vec4(col, .05 + f*.75 + spec*.9 + rim);
      }`
  });

  function waterMat(len) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: uniforms.uTime, uLen: { value: len }, uSpeed: { value: 1.5 } },
      vertexShader: `
        varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position,1.);
          vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime, uLen, uSpeed;
        varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){
          float s = vUv.x * uLen - uTime * uSpeed;
          float a = vUv.y * 6.2832;
          float wob = sin(a * 2. + s * .6) * 1.1 + sin(a * 3. - s * .9) * .5;
          float streak = smoothstep(.62, 1., sin(s * 1.9 + wob) * .5 + .5);
          float fine = smoothstep(.75, 1., sin(s * 7.5 - a + wob * .5) * .5 + .5);
          float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 1.4);
          vec3 deep = vec3(.03, .36, .80), light = vec3(.50, .92, 1.);
          vec3 col = mix(deep, light, clamp(f * .85 + streak * .32 + fine * .12, 0., 1.));
          col += vec3(.85, .97, 1.) * (streak * streak * .22 + fine * .08);
          gl_FragColor = vec4(col, .5 + f * .32 + streak * .1);
        }`
    });
  }

  const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 1, roughness: 0.22 });
  const red = new THREE.MeshStandardMaterial({ color: 0xe8212b, metalness: 0.15, roughness: 0.35 });
  const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false });

  /* ---------- tracé des tuyaux (lignes droites et coudes arrondis) ---------- */
  function pipePath(pts, r) {
    const path = new THREE.CurvePath();
    const v = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    let start = v[0].clone();
    const bends = [];
    for (let i = 1; i < v.length - 1; i++) {
      const dIn = v[i].clone().sub(v[i - 1]).normalize();
      const dOut = v[i + 1].clone().sub(v[i]).normalize();
      const a = v[i].clone().addScaledVector(dIn, -r);
      const b = v[i].clone().addScaledVector(dOut, r);
      path.add(new THREE.LineCurve3(start, a));
      path.add(new THREE.QuadraticBezierCurve3(a, v[i].clone(), b));
      bends.push([a, b, dIn, dOut]);
      start = b;
    }
    path.add(new THREE.LineCurve3(start, v[v.length - 1]));
    return { path, bends };
  }

  const up = new THREE.Vector3(0, 1, 0);
  function ring(pos, dir, R, len, mat) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, len, 40, 1), mat || chrome);
    m.position.copy(pos);
    m.quaternion.setFromUnitVectors(up, dir.clone().normalize());
    world.add(m);
    return m;
  }

  const PIPES = [
    // [points, rayon, rayon de coude]
    [[[-14, -2.7, 0], [2.4, -2.7, 0], [2.4, 1.3, 0], [15, 1.3, 0]], 0.46, 1.05],
    [[[5.3, -9, -1.8], [5.3, 3.1, -1.8], [0.2, 3.1, -1.8], [0.2, 9, -1.8]], 0.38, 0.95],
    [[[7.6, 9, 1.5], [7.6, -0.7, 1.5], [15, -0.7, 1.5]], 0.27, 0.7],
    [[[15, -0.2, -3.6], [-0.9, -0.2, -3.6], [-0.9, -9, -3.6]], 0.33, 0.85]
  ];

  const flows = [];
  PIPES.forEach(([pts, R, br], k) => {
    const { path, bends } = pipePath(pts, br);
    const len = path.getLength();
    const seg = Math.max(80, Math.round(len * 14));

    const water = new THREE.Mesh(new THREE.TubeGeometry(path, seg, R * 0.74, 36, false), waterMat(len));
    water.renderOrder = 1;
    const glass = new THREE.Mesh(new THREE.TubeGeometry(path, seg, R, 40, false), glassMat);
    glass.renderOrder = 2;
    world.add(water, glass);

    // raccords chromés de part et d'autre de chaque coude, et à intervalles réguliers
    bends.forEach(([a, b, dIn, dOut]) => {
      ring(a, dIn, R * 1.16, R * 0.55);
      ring(b, dOut, R * 1.16, R * 0.55);
    });
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = new THREE.Vector3(...pts[i]), p1 = new THREE.Vector3(...pts[i + 1]);
      const d = p1.clone().sub(p0), L = d.length();
      for (let t = 3.2; t < L - 2; t += 4.6) ring(p0.clone().addScaledVector(d, t / L), d, R * 1.12, R * 0.38);
    }

    // bulles : elles suivent l'eau
    const frames = path.computeFrenetFrames(400, false);
    const count = Math.round(len * 1.6);
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), bubbleMat, count);
    mesh.renderOrder = 1.5;
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({ u: Math.random(), ang: Math.random() * 6.283, rr: Math.random() * R * 0.55, s: R * (0.05 + Math.random() * 0.11), sp: 0.85 + Math.random() * 0.4 });
    }
    world.add(mesh);
    flows.push({ path, len, frames, mesh, data, speed: 1.5 });
  });

  // vanne à volant sur la colonne montante du premier tuyau
  const valve = new THREE.Group();
  valve.position.set(2.4, -0.55, 0);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.66, 40, 24), chrome);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 20), chrome);
  stem.rotation.x = Math.PI / 2; stem.position.z = 0.6;
  const wheel = new THREE.Group();
  wheel.position.z = 1.05;
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.075, 16, 60), red));
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.06), red);
    spoke.rotation.z = (i * Math.PI) / 3; wheel.add(spoke);
  }
  wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 24).rotateX(Math.PI / 2), red));
  valve.add(body, stem, wheel);
  world.add(valve);

  // manomètre sur le deuxième tuyau
  const gauge = new THREE.Group();
  gauge.position.set(5.3, 1.1, -1.8);
  gauge.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 16).rotateZ(Math.PI / 2).translate(-0.62, 0, 0), chrome));
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.16, 48).rotateX(Math.PI / 2), chrome);
  face.position.x = -1.05;
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshBasicMaterial({ color: 0xf3f7fb }));
  dial.position.set(-1.05, 0, 0.085);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.01).translate(0.13, 0, 0), new THREE.MeshBasicMaterial({ color: 0xe8212b }));
  needle.position.set(-1.05, 0, 0.1);
  gauge.add(face, dial, needle);
  world.add(gauge);

  /* ---------- mise en page selon le format ---------- */
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
    if (camera.aspect > 1.05) {        // ordinateur : réseau à droite du texte
      const wide = camera.aspect > 1.5;
      const s = wide ? 0.84 : 0.6;
      world.scale.setScalar(s);
      world.position.set(halfW - 6.6 * s - (wide ? 0.4 : -0.6), wide ? -0.2 : 0.6, 0);
    } else {                           // téléphone : réseau en haut, derrière le titre
      const s = 0.62;
      world.scale.setScalar(s);
      world.position.set(halfW - 8.6 * s, 3.4, -1);
    }
  }

  /* ---------- animation ---------- */
  const tmp = new THREE.Object3D();
  const clock = new THREE.Clock();
  let t = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollP = 0;

  function updateBubbles(dt) {
    flows.forEach(f => {
      const N = f.frames.tangents.length - 1;
      f.data.forEach((b, i) => {
        b.u = (b.u + (f.speed * b.sp * dt) / f.len) % 1;
        const p = f.path.getPointAt(b.u);
        const k = Math.min(N, Math.round(b.u * N));
        const n = f.frames.normals[k], bn = f.frames.binormals[k];
        tmp.position.copy(p).addScaledVector(n, Math.cos(b.ang) * b.rr).addScaledVector(bn, Math.sin(b.ang) * b.rr);
        tmp.scale.setScalar(b.s);
        tmp.updateMatrix();
        f.mesh.setMatrixAt(i, tmp.matrix);
      });
      f.mesh.instanceMatrix.needsUpdate = true;
    });
  }

  function render(dt) {
    t += dt;
    uniforms.uTime.value = t;
    updateBubbles(dt);
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.5);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.5);
    rig.rotation.y = -0.22 + pointer.x * 0.12 + scrollP * 0.25;
    rig.rotation.x = 0.1 + pointer.y * 0.08 - scrollP * 0.15;
    rig.position.y = scrollP * 2.2;
    wheel.rotation.z = scrollP * 3 + Math.sin(t * 0.4) * 0.05;
    needle.rotation.z = 0.9 - Math.sin(t * 0.7) * 0.08 - Math.sin(t * 2.3) * 0.03;
    renderer.render(scene, camera);
  }

  layout();
  updateBubbles(0);
  render(0);
  canvas.classList.add('is-on');
  hero.classList.add('has-3d');

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); if (reduce) render(0); }, 120); });
  if (reduce) return;

  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    pointer.tx = (e.clientX - r.left) / r.width * 2 - 1;
    pointer.ty = (e.clientY - r.top) / r.height * 2 - 1;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });
  window.addEventListener('scroll', () => {
    scrollP = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight || 1)));
  }, { passive: true });

  let visible = true, raf = 0;
  function loop() {
    raf = 0;
    if (!visible || document.hidden) { clock.getDelta(); return; }
    render(Math.min(0.05, clock.getDelta()));
    raf = requestAnimationFrame(loop);
  }
  function wake() { if (!raf) { clock.getDelta(); raf = requestAnimationFrame(loop); } }
  new IntersectionObserver(en => { visible = en[0].isIntersecting; wake(); }).observe(canvas);
  document.addEventListener('visibilitychange', wake);
  wake();
}
