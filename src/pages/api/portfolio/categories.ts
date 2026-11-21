import type { APIRoute } from 'astro';
import { getPublicCategories } from '@/lib/public-portfolio';
export const prerender = false;
export const GET: APIRoute = async ({ locals }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) return Response.json({ success: false, categories: [] }, { status: 503 });
  try {
    return Response.json({ success: true, categories: await getPublicCategories(db) },
      { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch { return Response.json({ success: false, categories: [] }, { status: 503 }); }
};
