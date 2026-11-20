import { fetchDurete, findCommunes, getCommune, parseQuery, type CommuneGeo, type DureteCommune } from '../lib/durete-live';
import { CONSEILS, classify, fmt, fmtDate } from '../lib/durete';

// Nom de réseau lisible : « VOIRON ST JOSEPH » → « Voiron St Joseph »
const tidy = (s: string) => s.toLowerCase().replace(/(^|[\s\-'(/])([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase());
const where = (c: CommuneGeo) => [c.cp[0], c.depNom].filter(Boolean).join(' · ');
const thText = (d: DureteCommune) => (d.min !== d.max ? `${fmt(d.min)} à ${fmt(d.max)} °f` : `${fmt(d.principal)} °f`);
const pct = (v: number) => `${(Math.min(50, Math.max(0, v)) / 50) * 100}%`;

export function initDureteSearch(): void {
  document.querySelectorAll<HTMLElement>('[data-durete-search]').forEach((root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';
    const input = root.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    const list = root.querySelector<HTMLUListElement>('[role="listbox"]')!;
    const status = root.querySelector<HTMLElement>('[data-ds-status]')!;
    const spin = root.querySelector<HTMLElement>('[data-ds-spin]')!;
    const out = root.querySelector<HTMLElement>('[data-ds-out]');
    const tpl = root.querySelector<HTMLTemplateElement>('[data-ds-tpl]');
    const mini = root.querySelector<HTMLElement>('[data-ds-mini]');
    const full = root.dataset.mode === 'full';
    let items: CommuneGeo[] = [];
    let active = -1;
    let searchCtl: AbortController | null = null;
    let loadCtl: AbortController | null = null;
    let timer: number | undefined;

    const busy = (on: boolean) => { spin.hidden = !on; };
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
    const highlight = (i: number) => {
      active = i;
      [...list.children].forEach((li, k) => li.setAttribute('aria-selected', String(k === i)));
      if (i >= 0) { input.setAttribute('aria-activedescendant', list.children[i].id); (list.children[i] as HTMLElement).scrollIntoView({ block: 'nearest' }); }
    };

    const render = () => {
      list.textContent = '';
      items.forEach((c, i) => {
        const li = document.createElement('li');
        li.id = `${input.id}-o${i}`; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
        const n = document.createElement('span'); n.className = 'o-name'; n.textContent = c.nom;
        const m = document.createElement('span'); m.className = 'o-meta'; m.textContent = where(c);
        li.append(n, m);
        li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(c); });
        list.append(li);
      });
      const open = items.length > 0;
      list.hidden = !open; input.setAttribute('aria-expanded', String(open));
      active = -1;
    };

    const message = (text: string, retry?: () => void) => {
      if (!out) { if (mini) { mini.hidden = false; mini.textContent = text; } return; }
      out.textContent = '';
      const box = document.createElement('div'); box.className = 'msg';
      const p = document.createElement('p'); p.textContent = text; box.append(p);
      if (retry) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn--ghost'; b.textContent = 'Réessayer'; b.addEventListener('click', retry); box.append(b); }
      out.append(box);
    };

    const showCard = (c: CommuneGeo, d: DureteCommune) => {
      if (!out || !tpl) return;
      const cls = classify(d.principal);
      const frag = tpl.content.cloneNode(true) as DocumentFragment;
      const f = (k: string) => frag.querySelector<HTMLElement>(`[data-f="${k}"]`)!;
      f('nom').textContent = `Dureté de l'eau à ${c.nom}`;
      f('where').textContent = where(c);
      f('val').textContent = fmt(d.principal);
      f('cls').textContent = cls;
      const many = d.reseaux.length > 1;
      f('range').textContent = (many && d.min !== d.max ? `De ${fmt(d.min)} à ${fmt(d.max)} °f selon le quartier (${d.reseaux.length} réseaux d'eau). ` : '') + `Dernière analyse publiée le ${fmtDate(d.date)}.`;
      f('adv').textContent = CONSEILS[cls];
      (f('diag') as HTMLAnchorElement).href = `${root.dataset.diag}?commune=${encodeURIComponent(c.nom)}&durete=${d.principal}`;
      const mark = f('mark'); mark.style.left = '0%';
      const band = f('band');
      if (many && d.min !== d.max) { band.style.left = pct(d.min); band.style.width = `calc(${pct(d.max)} - ${pct(d.min)})`; } else band.remove();
      f('nets-sum').textContent = many ? `Détail par réseau d'eau (${d.reseaux.length})` : "Le réseau d'eau de la commune";
      const ul = f('nets');
      d.reseaux.forEach((r) => {
        const li = document.createElement('li');
        const n = document.createElement('b'); n.textContent = tidy(r.nom);
        const v = document.createElement('span'); v.className = 'num'; v.textContent = `${fmt(r.mediane)} °f`;
        const q = document.createElement('span'); q.className = 'n-q';
        q.textContent = `${r.quartiers.length ? `${r.quartiers.map(tidy).join(', ')} · ` : ''}${r.mesures} analyse${r.mesures > 1 ? 's' : ''} en un an, la dernière le ${fmtDate(r.date)} (${fmt(r.dernier)} °f)`;
        li.append(n, v, q); ul.append(li);
      });
      const src = f('src');
      src.append("Source : contrôle sanitaire de l'eau du robinet (ARS), publié par ");
      const a = document.createElement('a'); a.href = 'https://hubeau.eaufrance.fr/page/api-qualite-eau-potable'; a.rel = 'noopener'; a.textContent = "Hub'Eau";
      src.append(a, ". Médiane des analyses de l'année précédant la dernière mesure. Valeur indicative : votre facture d'eau indique aussi la dureté (TH).");
      out.textContent = '';
      out.append(frag);
      requestAnimationFrame(() => requestAnimationFrame(() => { mark.style.left = pct(d.principal); }));
      const h = out.querySelector<HTMLElement>('.c-name')!;
      h.focus({ preventScroll: true });
      const r = out.getBoundingClientRect();
      if (r.top > innerHeight * 0.6 || r.top < 0) out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    };

    const showMini = (c: CommuneGeo, d: DureteCommune) => {
      const th = document.querySelector<HTMLInputElement>('#th');
      if (th) { th.value = String(Math.round(Math.min(50, d.principal))); th.dispatchEvent(new Event('input', { bubbles: true })); }
      if (!mini) return;
      mini.hidden = false; mini.textContent = '';
      const b = document.createElement('b'); b.textContent = `${c.nom} : ${thText(d)}`;
      const link = document.createElement('a');
      link.href = `${root.dataset.page}?code=${c.code}`; link.className = 'link link--accent'; link.textContent = 'Le détail de votre commune';
      mini.append(b, ` — eau ${classify(d.principal)}. `, link);
    };

    const load = async (c: CommuneGeo) => {
      loadCtl?.abort(); loadCtl = new AbortController();
      busy(true);
      status.textContent = `Recherche des analyses de l'eau à ${c.nom}…`;
      if (out) out.setAttribute('aria-busy', 'true');
      try {
        const d = await fetchDurete(c.code, loadCtl.signal);
        if (!d) { status.textContent = ''; message(`Aucune analyse de dureté publiée ces trois dernières années pour ${c.nom}. Votre facture d'eau ou votre mairie peuvent vous l'indiquer.`); }
        else { status.textContent = `${c.nom} : ${thText(d)}, eau ${classify(d.principal)}.`; status.classList.toggle('visually-hidden', full); if (full) showCard(c, d); else showMini(c, d); }
        if (full) history.replaceState(null, '', `?code=${c.code}`);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        status.textContent = '';
        message("Le service public des données sur l'eau ne répond pas pour le moment.", () => load(c));
      } finally { busy(false); out?.removeAttribute('aria-busy'); }
    };

    const choose = (c: CommuneGeo) => {
      close();
      input.value = `${c.nom} (${c.cp[0] ?? c.dep})`;
      load(c);
    };

    const search = async () => {
      status.classList.remove('visually-hidden');
      const q = input.value;
      const p = parseQuery(q);
      searchCtl?.abort();
      if (!p) { items = []; render(); status.textContent = ''; return; }
      if (p.kind === 'partial') { items = []; render(); status.textContent = 'Tapez les 5 chiffres du code postal.'; return; }
      searchCtl = new AbortController();
      busy(true);
      try {
        items = await findCommunes(q, searchCtl.signal);
        render();
        status.textContent = items.length ? `${items.length} commune${items.length > 1 ? 's' : ''} trouvée${items.length > 1 ? 's' : ''}. Choisissez la vôtre.` : 'Aucune commune ne correspond.';
      } catch (e) {
        if ((e as Error).name !== 'AbortError') status.textContent = 'La recherche ne répond pas pour le moment. Réessayez dans un instant.';
      } finally { busy(false); }
    };

    input.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(search, 180); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); if (list.hidden) render(); highlight(Math.min(items.length - 1, active + 1)); }
      else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); highlight(Math.max(0, active - 1)); }
      else if (e.key === 'Enter') { const c = items[active >= 0 ? active : 0]; if (c) { e.preventDefault(); choose(c); } }
      else if (e.key === 'Escape') close();
    });
    input.addEventListener('blur', () => setTimeout(close, 120));

    // Adresse partagée : /durete-eau/?code=38563
    const code = full ? new URLSearchParams(location.search).get('code') : null;
    if (code) getCommune(code).then((c) => { if (c) { input.value = `${c.nom} (${c.cp[0] ?? c.dep})`; load(c); } });
  });
}
