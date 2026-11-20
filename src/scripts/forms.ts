import { buildMessage, mailtoUrl, type FormData as Data } from '../lib/message';

const KEY = import.meta.env.PUBLIC_WEB3FORMS_KEY as string | undefined;

function read(form: HTMLFormElement): Data {
  const out: Data = {};
  new FormData(form).forEach((v, k) => { if (k !== 'botcheck') out[k] = String(v); });
  return out;
}

function setError(scope: HTMLElement, name: string, msg: string | null) {
  const err = scope.querySelector<HTMLElement>(`[data-error="${name}"]`);
  const fields = scope.querySelectorAll<HTMLInputElement>(`[name="${name}"]`);
  if (err) { err.textContent = msg ?? ''; err.hidden = !msg; }
  fields.forEach((f) => { if (msg) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid'); });
}

/** Vérifie les champs requis d'une zone ; renvoie le premier champ en erreur. */
function validate(scope: HTMLElement, form: HTMLFormElement): HTMLElement | null {
  let first: HTMLElement | null = null;
  const names = new Set([...scope.querySelectorAll<HTMLInputElement>('[data-required]')].map((f) => f.name));
  names.forEach((name) => {
    const fields = [...form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`)];
    const ok = fields.some((f) => (f.type === 'radio' ? f.checked : f.value.trim() !== ''));
    setError(scope, name, ok ? null : (fields[0].dataset.msg ?? 'Ce champ est à remplir.'));
    if (!ok && !first) first = fields[0];
  });
  const email = scope.querySelector<HTMLInputElement>('[name="email"]');
  if (email && email.value.trim() && !email.checkValidity()) {
    setError(scope, 'email', 'Cette adresse e-mail ne semble pas complète (exemple : nom@domaine.fr).');
    first ??= email;
  }
  const reach = scope.querySelector<HTMLElement>('[data-error="joindre"]');
  if (reach) {
    const tel = form.querySelector<HTMLInputElement>('[name="telephone"]')!.value.trim();
    const mail = form.querySelector<HTMLInputElement>('[name="email"]')!.value.trim();
    const ok = !!(tel || mail);
    reach.textContent = ok ? '' : 'Indiquez un téléphone ou un e-mail pour que nous puissions vous répondre.';
    reach.hidden = ok;
    if (!ok) first ??= form.querySelector<HTMLInputElement>('[name="telephone"]');
  }
  return first;
}

async function send(form: HTMLFormElement, kind: string) {
  const data = read(form);
  const msg = buildMessage(kind, data);
  const done = form.parentElement!.querySelector<HTMLElement>('[data-done]')!;
  const link = done.querySelector<HTMLAnchorElement>('[data-mailto]')!;
  const text = done.querySelector<HTMLElement>('[data-done-text]')!;
  link.href = mailtoUrl(msg);
  const bot = form.querySelector<HTMLInputElement>('[name="botcheck"]');
  if (bot?.checked) return;
  if (KEY) {
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: KEY, subject: msg.subject, from_name: data.nom || 'Site H2O Partner', email: data.email || undefined, message: msg.body }),
      });
      if (!res.ok) throw new Error(String(res.status));
      text.textContent = 'Votre demande est envoyée. Nous vous répondons rapidement, par téléphone ou par e-mail.';
      link.parentElement!.hidden = true;
    } catch {
      text.textContent = "L'envoi n'a pas abouti. Votre message est prêt : ouvrez-le dans votre messagerie, ou appelez-nous au 04 76 06 92 12.";
    }
  } else {
    text.textContent = 'Votre message est prêt. Il s’ouvre dans votre messagerie : il ne reste qu’à l’envoyer. Sinon, appelez-nous au 04 76 06 92 12.';
    window.location.href = link.href;
  }
  form.hidden = true;
  done.hidden = false;
  done.focus();
}

/** Pré-remplit les champs depuis l'adresse (?commune=…&durete=…), par exemple depuis une page commune. */
function prefill(form: HTMLFormElement) {
  const q = new URLSearchParams(window.location.search);
  for (const [name, value] of q) {
    const field = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${CSS.escape(name)}"]`);
    if (field && 'value' in field && field.type !== 'radio' && field.type !== 'checkbox' && !field.value) field.value = value.slice(0, 200);
  }
}

export function initForms(): void {
  document.querySelectorAll<HTMLFormElement>('form[data-diag]').forEach((form) => {
    if (form.dataset.ready) return; form.dataset.ready = '1';
    prefill(form);
    form.classList.add('stepped');
    const steps = [...form.querySelectorAll<HTMLFieldSetElement>('fieldset[data-step]')];
    const label = form.querySelector<HTMLElement>('[data-step-label]')!;
    const bar = form.querySelector<HTMLElement>('[data-step-bar]');
    const back = form.querySelector<HTMLButtonElement>('[data-back]')!;
    const next = form.querySelector<HTMLButtonElement>('[data-next]')!;
    const submit = form.querySelector<HTMLButtonElement>('[data-submit]')!;
    let i = 0;
    const show = (n: number, focus = true) => {
      i = n;
      steps.forEach((s, k) => (s.hidden = k !== i));
      label.textContent = `Étape ${i + 1} sur ${steps.length}`;
      if (bar) bar.style.transform = `scaleX(${(i + 1) / steps.length})`;
      back.hidden = i === 0;
      next.hidden = i === steps.length - 1;
      submit.hidden = i !== steps.length - 1;
      if (focus) steps[i].querySelector<HTMLElement>('legend')?.focus();
    };
    steps.forEach((s) => s.querySelector('legend')?.setAttribute('tabindex', '-1'));
    show(0, false);
    next.addEventListener('click', () => {
      const bad = validate(steps[i], form);
      if (bad) { bad.focus(); return; }
      show(i + 1);
    });
    back.addEventListener('click', () => show(i - 1));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const bad = validate(steps[i], form);
      if (bad) { bad.focus(); return; }
      send(form, 'Diagnostic');
    });
  });

  document.querySelectorAll<HTMLFormElement>('form[data-contact]').forEach((form) => {
    if (form.dataset.ready) return; form.dataset.ready = '1';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const bad = validate(form, form);
      if (bad) { bad.focus(); return; }
      send(form, 'Contact');
    });
  });
}
