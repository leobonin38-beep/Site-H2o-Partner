// Petit serveur statique pour les tests : sert dist/ sous BASE_PATH, comme GitHub Pages.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
const BASE = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
const ROOT = new URL('../dist/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf', '.ico': 'image/x-icon' };
async function find(p) {
  for (const c of [p, join(p, 'index.html')]) { try { if ((await stat(c)).isFile()) return c; } catch {} }
  return null;
}
http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!path.startsWith(BASE)) { res.writeHead(404); return res.end('hors base'); }
  const file = await find(join(ROOT, path.slice(BASE.length)));
  if (!file) { res.writeHead(404, { 'content-type': TYPES['.html'] }); return res.end(await readFile(join(ROOT, '404.html')).catch(() => 'introuvable')); }
  const type = TYPES[extname(file)] || 'application/octet-stream';
  let body = await readFile(file);
  const headers = { 'content-type': type, 'cache-control': /\/_astro\//.test(path) ? 'public, max-age=31536000, immutable' : 'public, max-age=600' };
  if (/text|javascript|json|xml|svg/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) { body = gzipSync(body); headers['content-encoding'] = 'gzip'; }
  res.writeHead(200, headers);
  res.end(body);
}).listen(Number(process.env.PORT || 4321));
