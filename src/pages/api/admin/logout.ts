import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '@/lib/admin-auth';

export const prerender = false;

export const POST: APIRoute = async ({ locals, cookies }) => {
  const db = (locals as { runtime?: { env?: { DB?: D1Database } } }).runtime?.env?.DB;
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (db && token) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
