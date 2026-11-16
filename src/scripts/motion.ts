import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

declare global {
  interface Window { __motionReady?: boolean; __lenisCount?: number; __lenis?: Lenis }
}

const html = document.documentElement;
const EASE = 'expo.out';

/**
 * Trois niveaux, comme prévu dans la conception :
 * 1. entrée du haut de page (une fois) ; 2. temps forts au défilement ; 3. micro-interactions (en CSS).
 * Tout état caché est posé par le script lui-même : sans JavaScript, rien n'est caché.
 */
export async function initMotion(): Promise<void> {
  if (window.__motionReady) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { html.classList.remove('m-pending'); window.__motionReady = true; return; }

  if (matchMedia('(pointer: fine)').matches) {
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
    window.__lenisCount = (window.__lenisCount ?? 0) + 1;
  }

  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]);
  heroEntrance();
  html.classList.remove('m-pending');
  textReveals();
  imageReveals();
  counters();
  stackedCards();
  rails();
  wordmark();
  window.__motionReady = true;
  ScrollTrigger.refresh();
}

function heroEntrance() {
  const title = document.querySelector<HTMLElement>('[data-hero-title]');
  const items = document.querySelectorAll<HTMLElement>('[data-hero-item]');
  if (!title) return;
  const split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'm-line' });
  const tl = gsap.timeline({ defaults: { ease: EASE } });
  tl.from(split.lines, { yPercent: 110, duration: 1.1, stagger: 0.09 })
    .from(items, { opacity: 0, y: 18, duration: 0.9, stagger: 0.08, clearProps: 'all' }, '-=0.75')
    .from('.hero video', { scale: 1.08, duration: 2.4, ease: 'power2.out', clearProps: 'scale' }, 0);
}

function textReveals() {
  document.querySelectorAll<HTMLElement>('[data-reveal-text]').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'm-line' });
    gsap.from(split.lines, {
      yPercent: 105, duration: 1, stagger: 0.07, ease: EASE,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

function imageReveals() {
  document.querySelectorAll<HTMLElement>('[data-reveal-img]').forEach((fig) => {
    const img = fig.querySelector('img');
    const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 85%', once: true } });
    tl.fromTo(fig, { clipPath: 'inset(12% 0% 12% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: EASE, clearProps: 'clipPath' });
    if (img) tl.from(img, { scale: 1.06, duration: 1.6, ease: EASE, clearProps: 'scale' }, 0);
  });
}

function counters() {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 1.4, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => { el.textContent = String(Math.round(obj.v)); },
      onComplete: () => { el.textContent = String(end); },
    });
  });
}

function stackedCards() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', () => {
    const cards = gsap.utils.toArray<HTMLElement>('[data-card]');
    cards.slice(0, -1).forEach((card, i) => {
      gsap.to(card, {
        scale: 0.95, filter: 'brightness(0.93)', ease: 'none', transformOrigin: '50% 0%',
        scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 20%', scrub: true },
      });
    });
  });
}

function wordmark() {
  const el = document.querySelector<HTMLElement>('[data-wordmark]');
  if (!el) return;
  const split = SplitText.create(el, { type: 'chars', mask: 'chars' });
  gsap.from(split.chars, {
    yPercent: 100, duration: 1.2, stagger: 0.035, ease: EASE,
    scrollTrigger: { trigger: el, start: 'top 95%', once: true },
    onComplete: () => split.revert(),
  });
}

function rails() {
  document.querySelectorAll<HTMLElement>('[data-rail]').forEach((rail) => {
    const fill = rail.querySelector<HTMLElement>('[data-rail-fill]');
    const steps = [...rail.querySelectorAll<HTMLElement>('[data-rail-step]')];
    if (!fill || !steps.length) return;
    rail.classList.add('rail-live');
    gsap.fromTo(fill, { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: {
        trigger: rail, start: 'top 70%', end: 'bottom 55%', scrub: 0.5,
        onUpdate: (self) => {
          const railTop = rail.getBoundingClientRect().top;
          const h = rail.offsetHeight * self.progress;
          steps.forEach((s) => s.classList.toggle('on', s.getBoundingClientRect().top - railTop <= h + 8));
        },
      },
    });
  });
}
