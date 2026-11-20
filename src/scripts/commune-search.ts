import { searchCommunes, type CommuneIndex } from '../lib/communes';
import { classify } from '../lib/hardness';

const fmt = (x: number) => x.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
let indexPromise: Promise<CommuneIndex[]> | null = null;
const loadIndex = (src: string) => (indexPromise ??= fetch(src).then((r) => r.json()));

function thLabel(c: CommuneIndex): string {
  if (c.th == null) return 'pas de mesure récente';
  return c.lo !== c.hi ? `${fmt(c.lo!)} à ${fmt(c.hi!)} °f` : `${fmt(c.th)} °f`;
}

export function initCommuneSearch(): void {
  document.querySelectorAll<HTMLElement>('[data-commune-search]').forEach((root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';
    const input = root.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    const list = root.querySelector<HTMLUListElement>('[role="listbox"]')!;
    const status = root.querySelector<HTMLElement>('[data-cs-status]')!;
    const result = root.querySelector<HTMLElement>('[data-commune-result]');
    const mode = root.dataset.mode;
    const base = root.dataset.base!;
    let items: CommuneIndex[] = [];
    let active = -1;

    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
    const highlight = (i: number) => {
      active = i;
      [...list.children].forEach((li, k) => li.setAttribute('aria-selected', String(k === i)));
      if (i >= 0) { input.setAttribute('aria-activedescendant', list.children[i].id); (list.children[i] as HTMLElement).scrollIntoView({ block: 'nearest' }); }
    };
    const choose = (c: CommuneIndex) => {
      close();
      input.value = `${c.n} (${c.cp[0] ?? ''})`;
      if (mode === 'navigate') {
        if (c.th != null) window.location.href = `${base}${c.s}/`;
        else status.textContent = `${c.n} : pas de mesure récente publiée pour cette commune.`;
        return;
      }
      // mode « ruler » : régler la règle de dureté de la page
      const th = document.querySelector<HTMLInputElement>('#th');
      if (c.th != null && th) { th.value = String(Math.round(Math.min(50, c.th))); th.dispatchEvent(new Event('input', { bubbles: true })); }
      if (result) {
        result.hidden = false;
        result.textContent = '';
        const b = document.createElement('b');
        b.textContent = `${c.n} : ${thLabel(c)}`;
        result.append(b);
        if (c.th != null) {
          result.append(document.createTextNode(` — eau ${classify(c.th)}. `));
          const a = document.createElement('a');
          a.href = `${base}${c.s}/`; a.className = 'link link--accent'; a.textContent = 'Le détail de votre commune';
          result.append(a);
        } else result.append(document.createTextNode(' — pas de mesure récente publiée.'));
      }
    };
    const render = () => {
      list.textContent = '';
      items.forEach((c, i) => {
        const li = document.createElement('li');
        li.id = `${input.id}-o${i}`; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
        const name = document.createElement('span'); name.className = 'o-name'; name.textContent = c.n;
        const cp = document.createElement('span'); cp.className = 'o-cp'; cp.textContent = c.cp.join(', ');
        name.append(cp);
        const th = document.createElement('span'); th.className = 'o-th'; th.textContent = thLabel(c);
        li.append(name, th);
        li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(c); });
        list.append(li);
      });
      const open = items.length > 0;
      list.hidden = !open; input.setAttribute('aria-expanded', String(open));
      status.textContent = input.value.trim().length < 2 ? '' : open ? `${items.length} commune${items.length > 1 ? 's' : ''} trouvée${items.length > 1 ? 's' : ''}.` : "Aucune commune d'Isère ne correspond.";
      active = -1;
    };

    input.addEventListener('focus', () => { loadIndex(root.dataset.index!).catch(() => {}); });
    input.addEventListener('input', async () => {
      const idx = await loadIndex(root.dataset.index!).catch(() => [] as CommuneIndex[]);
      items = searchCommunes(idx, input.value);
      render();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); highlight(Math.min(items.length - 1, active + 1)); }
      else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); highlight(Math.max(0, active - 1)); }
      else if (e.key === 'Enter') { const c = items[active >= 0 ? active : 0]; if (c && !list.hidden) { e.preventDefault(); choose(c); } }
      else if (e.key === 'Escape') close();
    });
    input.addEventListener('blur', () => setTimeout(close, 120));
  });
}
