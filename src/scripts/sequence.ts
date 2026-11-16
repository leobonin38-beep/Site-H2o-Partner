import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { frameAt } from '../lib/frames';

gsap.registerPlugin(ScrollTrigger);

type Manifest = Record<'wide' | 'tall', { count: number; width: number; height: number }>;

/**
 * Séquence « Comment l'eau devient douce » lue au défilement.
 * - L'épinglage est créé tout de suite (avant les autres animations de la page) pour que les
 *   déclencheurs situés plus bas tiennent compte de sa longueur. Il n'est utilisé que si la scène
 *   tient dans la hauteur de l'écran ; sinon la séquence avance sans épinglage.
 * - Les images ne sont téléchargées qu'à l'approche. Tant qu'elles manquent (ou si le manifeste est
 *   absent), l'image fixe et les 4 étapes restent affichées.
 * - Mouvement réduit : rien ne bouge, image fixe et étapes.
 */
export function initSequence(): void {
  const section = document.querySelector<HTMLElement>('[data-sequence]');
  if (!section || section.dataset.ready) return;
  section.dataset.ready = '1';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const html = document.documentElement;
  const canvas = section.querySelector<HTMLCanvasElement>('[data-seq-canvas]')!;
  const steps = [...section.querySelectorAll<HTMLElement>('[data-seq-step]')];
  const stage = section.querySelector<HTMLElement>('.stage')!;
  const stepsList = section.querySelector<HTMLElement>('.steps')!;
  const base = section.dataset.src!;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const layout: 'wide' | 'tall' = matchMedia('(max-width: 900px)').matches ? 'tall' : 'wide';
  let pinned = false;
  if (layout === 'wide') {
    html.classList.add('seq-pin');
    pinned = stage.offsetHeight <= window.innerHeight;
    if (!pinned) html.classList.remove('seq-pin');
  }

  let progress = 0;
  let render: () => void = () => {};
  const setProgress = (p: number) => {
    progress = p;
    render();
    const active = Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999));
    steps.forEach((s, i) => s.classList.toggle('on', i <= active));
  };

  ScrollTrigger.create({
    trigger: pinned || layout === 'wide' ? section : stepsList,
    start: pinned ? 'top top' : layout === 'wide' ? 'top 60%' : 'top 70%',
    end: pinned ? '+=220%' : layout === 'wide' ? 'bottom 40%' : 'bottom 70%',
    pin: pinned ? stage : false,
    scrub: pinned ? 0.9 : 0.6,
    onUpdate: (self) => setProgress(self.progress),
    onRefresh: (self) => setProgress(self.progress),
  });

  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    load().catch(() => { /* on garde l'image fixe */ });
  }, { rootMargin: '100% 0px' });
  io.observe(section);

  async function load() {
    const res = await fetch(base + 'manifest.json');
    if (!res.ok) throw new Error('manifeste absent');
    const { count, width, height } = ((await res.json()) as Manifest)[layout];
    canvas.width = width;
    canvas.height = height;

    const frames: (HTMLImageElement | null)[] = new Array(count).fill(null);
    const nearest = (i: number) => {
      for (let d = 0; d < count; d++) { const img = frames[i - d] ?? frames[i + d]; if (img) return img; }
      return null;
    };
    // Fondu entre deux images voisines selon la position exacte : un défilement lent reste fluide.
    render = () => {
      const { index, next, mix } = frameAt(progress, count);
      const a = nearest(index);
      if (!a) return;
      ctx!.globalAlpha = 1;
      ctx!.drawImage(a, 0, 0, width, height);
      const b = frames[next];
      if (mix > 0.01 && b && b !== a) {
        ctx!.globalAlpha = mix;
        ctx!.drawImage(b, 0, 0, width, height);
        ctx!.globalAlpha = 1;
      }
    };
    const fetchFrame = (i: number) => new Promise<void>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { frames[i] = img; if (Math.abs(i - progress * (count - 1)) < 2) render(); resolve(); };
      img.onerror = () => resolve();
      img.src = `${base}${layout}/f${String(i).padStart(3, '0')}.webp`;
    });

    // D'abord une image sur huit (aperçu sur toute la longueur), puis le reste par lots
    const order = [...Array(count).keys()].sort((a, b) => (a % 8 === 0 ? 0 : 1) - (b % 8 === 0 ? 0 : 1) || a - b);
    await fetchFrame(0);
    html.classList.add('seq-live');
    render();
    for (let k = 0; k < order.length; k += 6) await Promise.all(order.slice(k, k + 6).filter((i) => !frames[i]).map(fetchFrame));
  }
}
