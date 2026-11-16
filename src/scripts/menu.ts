/** Méga-menus (ordinateur), menu plein écran (téléphone), en-tête qui se range au défilement. */
export function initMenus(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header || header.dataset.ready) return;
  header.dataset.ready = '1';

  const triggers = [...header.querySelectorAll<HTMLButtonElement>('[data-mega-trigger]')];
  const panelOf = (t: HTMLButtonElement) => document.getElementById(t.getAttribute('aria-controls')!)!;
  const isOpen = (t: HTMLButtonElement) => t.getAttribute('aria-expanded') === 'true';
  const close = (t: HTMLButtonElement, focus = false) => {
    t.setAttribute('aria-expanded', 'false');
    panelOf(t).hidden = true;
    if (focus) t.focus();
  };
  const open = (t: HTMLButtonElement) => {
    triggers.forEach((o) => o !== t && close(o));
    t.setAttribute('aria-expanded', 'true');
    panelOf(t).hidden = false;
  };
  const hoverable = matchMedia('(hover: hover) and (pointer: fine)').matches;
  triggers.forEach((t) => {
    t.addEventListener('click', () => (isOpen(t) ? close(t) : open(t)));
    const li = t.parentElement!;
    let timer: number | undefined;
    if (hoverable) {
      li.addEventListener('mouseenter', () => { clearTimeout(timer); open(t); });
      li.addEventListener('mouseleave', () => { timer = window.setTimeout(() => close(t), 160); });
    }
    li.addEventListener('focusout', (e) => { if (!li.contains(e.relatedTarget as Node)) close(t); });
  });

  const burger = header.querySelector<HTMLButtonElement>('[data-burger]')!;
  const mobile = header.querySelector<HTMLElement>('[data-mobile]')!;
  const setMobile = (on: boolean, focus = false) => {
    burger.setAttribute('aria-expanded', String(on));
    mobile.hidden = !on;
    burger.textContent = on ? 'Fermer' : 'Menu';
    burger.setAttribute('aria-label', 'Menu');
    document.documentElement.classList.toggle('menu-open', on);
    header.classList.toggle('is-solid', on || window.scrollY > 80);
    if (on) mobile.querySelector<HTMLElement>('a')?.focus();
    else if (focus) burger.focus();
  };
  burger.addEventListener('click', () => setMobile(!isOpen(burger)));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openTrigger = triggers.find(isOpen);
    if (openTrigger) close(openTrigger, true);
    if (isOpen(burger)) setMobile(false, true);
  });

  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-solid', y > 80 || !mobile.hidden);
    const menusClosed = mobile.hidden && !triggers.some(isOpen);
    if (y > lastY + 4 && y > 240 && menusClosed) header.classList.add('is-hidden');
    if (y < lastY - 4 || y < 240) header.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
