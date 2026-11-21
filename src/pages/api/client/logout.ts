import type { APIRoute } from 'astro';
export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const db = locals.runtime?.env?.DB;
  if (!db) return Response.json({ success: false, error: 'Service unavailable' }, { status: 503 });
  try {
    await db.prepare('UPDATE client_users SET token = NULL, csrf_token = NULL, token_expires_at = NULL WHERE token = ?').bind(token).run();
    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false, error: 'Unable to sign out. Please retry.' }, { status: 503 });
  }
};
