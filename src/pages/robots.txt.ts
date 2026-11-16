import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL;
  const indexable = import.meta.env.PUBLIC_INDEXABLE === 'true';
  const sitemap = new URL(base.replace(/^\//, '') + 'sitemap-index.xml', site).href;
  const body = indexable ? `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n` : `User-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
