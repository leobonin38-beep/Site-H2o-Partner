import { SITE } from '../config/site';

export type FormData = Record<string, string>;
const LABELS: Record<string, string> = {
  profil: 'Profil', besoin: 'Besoin', commune: 'Commune', durete: 'Dureté connue', nom: 'Nom', telephone: 'Téléphone',
  email: 'E-mail', objet: 'Objet', message: 'Message',
};

/** Compose le message envoyé à l'entreprise à partir des champs d'un formulaire. */
export function buildMessage(kind: string, data: FormData): { subject: string; body: string } {
  const head = [data.profil || data.objet, data.commune].filter(Boolean).join(', ');
  const subject = head ? `${kind} : ${head}` : kind;
  const lines = Object.entries(LABELS)
    .filter(([k]) => (data[k] ?? '').trim() !== '')
    .map(([k, label]) => (k === 'durete' ? `${label} : ${data[k].trim()} °f` : k === 'message' ? `\n${data[k].trim()}` : `${label} : ${data[k].trim()}`));
  return { subject, body: lines.join('\n') };
}

export function mailtoUrl(m: { subject: string; body: string }): string {
  const enc = (s: string) => encodeURIComponent(s.replace(/\r?\n/g, '\r\n'));
  return `mailto:${SITE.email}?subject=${enc(m.subject)}&body=${enc(m.body)}`;
}
