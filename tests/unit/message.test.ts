import { describe, it, expect } from 'vitest';
import { buildMessage, mailtoUrl } from '../../src/lib/message';

describe('buildMessage', () => {
  const m = buildMessage('Diagnostic', { profil: 'Un particulier', besoin: 'Calcaire, eau dure', commune: 'Voiron (38500)', durete: '32', nom: 'Jeanne Martin', telephone: '06 00 00 00 00', email: '', message: '' });
  it('sujet lisible avec le profil et la commune', () => {
    expect(m.subject).toBe('Diagnostic : Un particulier, Voiron (38500)');
  });
  it('corps avec une ligne par champ rempli, sans les champs vides', () => {
    expect(m.body).toContain('Besoin : Calcaire, eau dure');
    expect(m.body).toContain('Dureté connue : 32 °f');
    expect(m.body).not.toContain('E-mail :');
  });
});

describe('mailtoUrl', () => {
  it('encode sujet et corps vers l’adresse de l’entreprise', () => {
    const u = mailtoUrl({ subject: 'A & B', body: 'ligne 1\nligne 2' });
    expect(u.startsWith('mailto:commercial@h2o-partner.fr?subject=A%20%26%20B&body=')).toBe(true);
    expect(u).toContain('ligne%201%0D%0Aligne%202');
  });
});
