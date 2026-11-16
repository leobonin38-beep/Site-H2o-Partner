import { classify, sodiumAdded } from '../lib/hardness';

export function initHardness(): void {
  const th = document.querySelector<HTMLInputElement>('#th');
  const cible = document.querySelector<HTMLInputElement>('#cible');
  if (!th || !cible || th.dataset.ready) return;
  th.dataset.ready = '1';
  const thOut = document.querySelector('#th-out b')!;
  const cibleOut = document.querySelector('#cible-out b')!;
  const classe = document.querySelector('#th-classe')!;
  const sodium = document.querySelector('#sodium')!;
  const update = () => {
    const d = Number(th.value);
    if (Number(cible.value) > d) cible.value = String(d);
    const c = Number(cible.value);
    thOut.textContent = String(d);
    cibleOut.textContent = String(c);
    classe.textContent = classify(d);
    sodium.textContent = String(sodiumAdded(d, c));
    th.setAttribute('aria-valuetext', `${d} degrés français, eau ${classify(d)}`);
    cible.setAttribute('aria-valuetext', `${c} degrés français`);
  };
  th.addEventListener('input', update);
  cible.addEventListener('input', update);
  update();
}
