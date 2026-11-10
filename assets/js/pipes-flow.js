/* ==========================================================
   Passages de tuyaux entre les sections.
   Une seule toile WebGL, fixée devant la page mais transparente
   aux clics, ne dessine que dans des zones vides :
   - grand écran : à droite du titre de la section ;
   - tablette et téléphone : dans la marge au-dessus du titre.
   Les tuyaux entrent et sortent par le haut de la section ou par
   le bord de l'écran : ils semblent traverser le site.
   Sections concernées : attribut data-pipes="a" | "b"
   (+ data-pipes-theme="dark" sur fond sombre).
   ========================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { createKit } from './pipes-kit.js';

const sections = Array.from(document.querySelectorAll('[data-pipes]'));
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (sections.length) {
  try { init(); } catch (e) { /* pas de WebGL : la page reste telle quelle */ }
}

function init() {
  const canvas = document.createElement('canvas');
  canvas.className = 'pipes-layer';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.autoClear = false;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const kit = createKit();
  const U = 100;                       // 1 unité 3D = 100 pixels

  const slots = sections.map((sec, i) => {
    const scene = new THREE.Scene();
    scene.environment = env;
    const rig = new THREE.Group();
    scene.add(rig);
    return {
      sec, head: sec.querySelector('.section__head'),
      variant: sec.dataset.pipes, onLight: sec.dataset.pipesTheme !== 'dark',
      dir: i % 2 ? -1 : 1, scene, rig, world: null, flows: [], wheel: null,
      camera: new THREE.PerspectiveCamera(30, 1, 0.1, 200), key: '', pad: 0
    };
  });

  function measure() {
    slots.forEach(s => { s.pad = parseFloat(getComputedStyle(s.sec).paddingTop) || 0; });
  }

  // zone vide où dessiner, en pixels écran
  function zone(s, vw) {
    const sr = s.sec.getBoundingClientRect();
    if (s.head && vw >= 1180) {
      const hr = s.head.getBoundingClientRect();
      const x = hr.right + 48;
      if (vw - x > 280) return { mode: 'box', x, y: sr.top, w: vw - x, h: hr.bottom - sr.top };
    }
    const h = s.pad - 22;
    if (h < 50) return null;
    return { mode: 'strip', x: 0, y: sr.top + 4, w: vw, h };
  }

  function build(s, z) {
    if (s.world) { s.rig.remove(s.world); s.world.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const world = new THREE.Group();
    s.world = world; s.flows = []; s.wheel = null;
    s.rig.add(world);
    const W = z.w / U, H = z.h / U;
    const o = { onLight: s.onLight, speed: 1.1, gap: 1.5, first: 0.8, bubbles: 2.4, detail: 22 };

    if (z.mode === 'box') {
      const xa = -W / 2 + Math.min(W * 0.3, 1.5);
      const yb = -H / 2 + Math.max(H * 0.4, 1.1);
      if (s.variant === 'a') {
        // descend du haut de la section, puis part vers le bord droit
        s.flows.push(kit.addPipe(world, [[xa, H / 2 + 1, 0], [xa, yb, 0], [W / 2 + 1, yb, 0]], 0.3, 0.55, o));
        // plus fin, en retrait : arrive du bord droit et remonte
        const yt = yb + Math.min(H * 0.3, 1.3), xt = xa + Math.min(W * 0.42, 2);
        s.flows.push(kit.addPipe(world, [[W / 2 + 1, yt, -0.8], [xt, yt, -0.8], [xt, H / 2 + 1, -0.8]], 0.18, 0.4, o));
      } else {
        // arrive du bord droit, remonte vers le haut de la section ; vanne sur le trajet
        s.flows.push(kit.addPipe(world, [[W / 2 + 1, yb, 0], [xa, yb, 0], [xa, H / 2 + 1, 0]], 0.3, 0.55, o));
        const { valve, wheel } = kit.makeValve();
        valve.scale.setScalar(0.42);
        valve.position.set(xa + Math.min(W * 0.45, 2.1), yb, 0);
        world.add(valve);
        s.wheel = wheel;
        const xt = xa + Math.min(W * 0.22, 1);
        s.flows.push(kit.addPipe(world, [[xt, H / 2 + 1, -0.9], [xt, yb + 0.75, -0.9], [W / 2 + 1, yb + 0.75, -0.9]], 0.16, 0.35, o));
      }
    } else {
      // bande : un tuyau traverse l'écran d'un bord à l'autre, dans un sens puis dans l'autre
      const R = Math.min(0.2, H * 0.24);
      const pts = [[-W / 2 - 1, 0, 0], [W / 2 + 1, 0, 0]];
      if (s.dir < 0) pts.reverse();
      s.flows.push(kit.addPipe(world, pts, R, 0.3, { ...o, gap: 1.8, first: 0.9 }));
    }
    // bande fine : caméra lointaine et angle étroit, pour éviter la déformation sur les bords
    const fov = z.mode === 'box' ? 30 : 6;
    s.camera.fov = fov;
    s.camera.aspect = W / H;
    s.camera.position.set(0, 0, (H / 2) / Math.tan(THREE.MathUtils.degToRad(fov / 2)));
    s.camera.far = s.camera.position.z + 20;
    s.camera.updateProjectionMatrix();
  }

  function resize() {
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(vw, vh, false);
    measure();
  }

  let t = 0;
  function frame(dt) {
    t += dt;
    kit.uniforms.uTime.value = t;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    for (const s of slots) {
      const z = zone(s, vw);
      if (!z || z.y + z.h < 0 || z.y > vh) continue;
      const key = z.mode + Math.round(z.w) + 'x' + Math.round(z.h);
      if (key !== s.key) { s.key = key; build(s, z); }
      kit.updateFlows(s.flows, dt);
      // légère rotation selon la position dans l'écran : le tuyau « vit » pendant le défilement
      const p = (z.y + z.h / 2) / vh - 0.5;
      const box = z.mode === 'box';
      s.rig.rotation.y = box ? p * 0.32 * s.dir : 0;
      s.rig.rotation.x = box ? 0.06 - p * 0.12 : 0;
      if (s.wheel) s.wheel.rotation.z = p * 4;
      const y = vh - z.y - z.h;
      renderer.setViewport(z.x, y, z.w, z.h);
      renderer.setScissor(z.x, y, z.w, z.h);
      renderer.render(s.scene, s.camera);
    }
  }

  resize();
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); frame(0); }, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); frame(0); });

  if (reduce) {
    // sans animation : on redessine seulement quand la page bouge
    frame(0);
    window.addEventListener('scroll', () => frame(0), { passive: true });
    return;
  }

  // après Lenis (ticker GSAP) pour rester parfaitement calé sur le défilement
  if (window.gsap && window.gsap.ticker) {
    window.gsap.ticker.add((time, deltaMs) => frame(Math.min(0.05, deltaMs / 1000)));
  } else {
    let last = performance.now();
    (function loop(now) {
      frame(Math.min(0.05, (now - last) / 1000)); last = now;
      requestAnimationFrame(loop);
    })(last);
  }
}
