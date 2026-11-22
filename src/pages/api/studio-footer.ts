import type { APIRoute } from 'astro';
import { getStudioContent } from '@/lib/studio-content';
export const prerender = false;
// Public copy only. Prebuilt pages use this to stay aligned with CMS edits.
export const GET: APIRoute = async ({ locals }) => {
  const content = await getStudioContent(locals.runtime?.env?.DB);
  return Response.json({ kicker: content.studio_footer_kicker, title: content.studio_footer_title }, { headers: { 'Cache-Control': 'public, max-age=60' } });
};
