import { describe, it, expect } from 'vitest';
import { usedPhotoCredits } from '../../src/lib/credits';

describe('usedPhotoCredits', () => {
  it('crédite chaque photo utilisée, avec auteur et lien Pexels', () => {
    const c = usedPhotoCredits();
    const files = c.map((x) => x.file);
    expect(files).toContain('technicien-chaufferie.jpg');
    expect(files).toContain('isere-village-vercors.jpg');
    for (const x of c) { expect(x.author.length).toBeGreaterThan(0); expect(x.source).toMatch(/^https:\/\/www\.pexels\.com\//); }
  });
});
