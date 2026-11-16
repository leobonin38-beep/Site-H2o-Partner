/** Préfixe un chemin interne par la base du site (racine ou sous-dossier GitHub Pages). */
export function url(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  return (base.replace(/\/$/, '') + '/' + path.replace(/^\//, '')) || '/';
}
