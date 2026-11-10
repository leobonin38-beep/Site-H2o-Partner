/* ==========================================================
   Accueil : réseau de tuyaux en verre où circule de l'eau (Three.js).
   Les éléments (verre, eau, bulles, raccords, vanne, manomètre)
   viennent de pipes-kit.js, partagé avec les passages entre sections.
   La scène suit doucement le pointeur et se déplace au défilement.
   Sans WebGL, le fond dégradé de l'accueil reste affiché.
   ========================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { createKit } from './pipes-kit.js';

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

  const kit = createKit();
  const PIPES = [
    // [points, rayon, rayon de coude]
    [[[-14, -2.7, 0], [2.4, -2.7, 0], [2.4, 1.3, 0], [15, 1.3, 0]], 0.46, 1.05],
    [[[5.3, -9, -1.8], [5.3, 3.1, -1.8], [0.2, 3.1, -1.8], [0.2, 9, -1.8]], 0.38, 0.95],
    [[[7.6, 9, 1.5], [7.6, -0.7, 1.5], [15, -0.7, 1.5]], 0.27, 0.7],
    [[[15, -0.2, -3.6], [-0.9, -0.2, -3.6], [-0.9, -9, -3.6]], 0.33, 0.85]
  ];
  const flows = PIPES.map(([pts, R, br]) => kit.addPipe(world, pts, R, br));

  const { valve, wheel } = kit.makeValve();
  valve.position.set(2.4, -0.55, 0);
  world.add(valve);

  const { gauge, needle } = kit.makeGauge();
  gauge.position.set(5.3, 1.1, -1.8);
  world.add(gauge);

  /* ---------- cadrage ----------
     La dernière image de la séquence vidéo est une capture de cette scène en 1376 × 768.
     Pour que le fondu vidéo → 3D soit invisible, la scène garde ce cadrage de référence
     et se recadre comme l'image (équivalent d'object-fit: cover), quel que soit l'écran. */
  const REF_ASPECT = 1376 / 768, REF_FOV = 32, REF_SCALE = 0.84;
  const FOCUS_PORTRAIT = 0.8;   // en portrait, on cadre sur la vanne (même valeur que dans hero-seq.js)
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    camera.fov = REF_FOV;
    camera.aspect = REF_ASPECT;
    // image de référence agrandie pour couvrir l'écran, dont on ne regarde qu'une fenêtre
    const k = Math.max(w / REF_ASPECT, h);
    const fullW = k * REF_ASPECT, fullH = k;
    const fx = w < h ? FOCUS_PORTRAIT : 0.5;
    camera.setViewOffset(fullW, fullH, (fullW - w) * fx, (fullH - h) / 2, w, h);
    camera.updateProjectionMatrix();
    const halfW = Math.tan(THREE.MathUtils.degToRad(REF_FOV / 2)) * camera.position.z * REF_ASPECT;
    world.scale.setScalar(REF_SCALE);
    world.position.set(halfW - 6.6 * REF_SCALE - 0.4, -0.2, 0);
  }

  /* ---------- animation ---------- */
  const clock = new THREE.Clock();
  let t = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollP = 0, live = 0;

  function render(dt) {
    t += dt;
    kit.uniforms.uTime.value = t;
    kit.updateFlows(flows, dt);
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.5);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.5);
    // le pointeur n'agit qu'une fois le fondu depuis la vidéo terminé (sinon les deux images se décalent)
    live += ((hero.dataset.live === '0' ? 0 : 1) - live) * Math.min(1, dt * 3);
    rig.rotation.y = -0.22 + pointer.x * 0.12 * live + scrollP * 0.25;
    rig.rotation.x = 0.1 + pointer.y * 0.08 * live - scrollP * 0.15;
    rig.position.y = scrollP * 2.2;
    wheel.rotation.z = scrollP * 3 + Math.sin(t * 0.4) * 0.05;
    needle.rotation.z = 0.9 - Math.sin(t * 0.7) * 0.08 - Math.sin(t * 2.3) * 0.03;
    renderer.render(scene, camera);
  }

  layout();
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
    // la scène ne réagit au défilement qu'une fois la zone fixée de l'accueil terminée
    const pinned = Math.max(0, hero.offsetHeight - window.innerHeight);
    scrollP = Math.min(1, Math.max(0, (window.scrollY - pinned) / (window.innerHeight || 1)));
  }, { passive: true });

  let visible = true, raf = 0;
  function loop() {
    raf = 0;
    if (!visible || document.hidden) { clock.getDelta(); return; }
    // pendant la séquence vidéo, la 3D est invisible : inutile de la calculer
    if (hero.dataset.mix === '0') { clock.getDelta(); raf = requestAnimationFrame(loop); return; }
    render(Math.min(0.05, clock.getDelta()));
    raf = requestAnimationFrame(loop);
  }
  function wake() { if (!raf) { clock.getDelta(); raf = requestAnimationFrame(loop); } }
  new IntersectionObserver(en => { visible = en[0].isIntersecting; wake(); }).observe(canvas);
  document.addEventListener('visibilitychange', wake);
  wake();
}
