import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type Manifest = Record<'wide' | 'tall', { count: number; width: number; height: number }>;

/**
 * Séquence « Comment l'eau devient douce » lue au défilement.
 * - Rien n'est chargé avant que la section soit à moins d'un écran.
 * - Mouvement réduit, script en échec ou manifeste absent : l'image fixe et les 4 étapes restent affichées.
 * - Ordinateur : la scène est épinglée pendant le défilement. Téléphone : pas d'épinglage, la séquence avance
 *   pendant que l'image traverse l'écran.
 */
export function initSequence(): void {
  const section = document.querySelector<HTMLElement>('[data-sequence]');
  if (!section || section.dataset.ready) return;
  section.dataset.ready = '1';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = section.querySelector<HTMLCanvasElement>('[data-seq-canvas]')!;
  const steps = [...section.querySelectorAll<HTMLElement>('[data-seq-step]')];
  const stage = section.querySelector<HTMLElement>('.stage')!;
  const stepsList = section.querySelector<HTMLElement>('.steps')!;
  const base = section.dataset.src!;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    start().catch(() => { /* on garde l'image fixe */ });
  }, { rootMargin: '100% 0px' });
  io.observe(section);

  async function start() {
    const res = await fetch(base + 'manifest.json');
    if (!res.ok) throw new Error('manifeste absent');
    const manifest = (await res.json()) as Manifest;
    const layout: 'wide' | 'tall' = matchMedia('(max-width: 900px)').matches ? 'tall' : 'wide';
    const { count, width, height } = manifest[layout];
    canvas.width = width;
    canvas.height = height;

    const frames: (HTMLImageElement | null)[] = new Array(count).fill(null);
    let current = 0;
    const draw = (i: number) => {
      // image demandée, sinon la plus proche déjà chargée
      for (let d = 0; d < count; d++) {
        const img = frames[i - d] ?? frames[i + d];
        if (img) { ctx!.drawImage(img, 0, 0, width, height); return; }
      }
    };
    const load = (i: number) => new Promise<void>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { frames[i] = img; if (Math.abs(i - current) < 2) draw(current); resolve(); };
      img.onerror = () => resolve();
      img.src = `${base}${layout}/f${String(i).padStart(3, '0')}.webp`;
    });

    // D'abord une image sur huit (aperçu rapide sur toute la longueur), puis le reste
    const order = [...Array(count).keys()].sort((a, b) => (a % 8 === 0 ? 0 : 1) - (b % 8 === 0 ? 0 : 1) || a - b);
    await load(0);
    document.documentElement.classList.add('seq-live');
    draw(0);
    (async () => { for (let k = 0; k < order.length; k += 6) await Promise.all(order.slice(k, k + 6).filter((i) => !frames[i]).map(load)); })();

    const setProgress = (p: number) => {
      current = Math.round(p * (count - 1));
      draw(current);
      const active = Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999));
      steps.forEach((s, i) => s.classList.toggle('on', i <= active));
    };
    setProgress(0);

    const desktop = layout === 'wide';
    ScrollTrigger.create({
      trigger: desktop ? section : stepsList,
      start: desktop ? 'top top' : 'top 70%',
      end: desktop ? '+=220%' : 'bottom 70%',
      pin: desktop ? stage : false,
      scrub: 0.4,
      onUpdate: (self) => setProgress(self.progress),
      onRefresh: (self) => setProgress(self.progress),
    });
    ScrollTrigger.refresh();
  }
}
