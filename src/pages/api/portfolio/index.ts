import type { APIRoute } from 'astro';
import { getPublicProjects } from '@/lib/public-portfolio';
export const prerender = false;
export const GET: APIRoute = async ({ locals, url }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) return Response.json({ success: false, projects: [] }, { status: 503 });
  try {
    const projects = await getPublicProjects(db, Number(url.searchParams.get('limit') ?? 60));
    return Response.json({ success: true, projects }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch { return Response.json({ success: false, projects: [] }, { status: 503 }); }
};
