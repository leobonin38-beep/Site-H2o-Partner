import type { APIRoute } from 'astro';
import { COMMUNES, toIndex } from '../../lib/durete';
/** Index léger (≈ 40 Ko) chargé par la recherche de commune, au premier usage seulement. */
export const GET: APIRoute = () => new Response(JSON.stringify(COMMUNES.map(toIndex)), { headers: { 'Content-Type': 'application/json' } });
