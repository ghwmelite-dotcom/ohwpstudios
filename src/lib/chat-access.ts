import type { AstroCookies } from 'astro';

const COOKIE = 'chat_visitor';
const LIFETIME = 60 * 60 * 24 * 30;

/** An unguessable HttpOnly visitor credential; row IDs never authorize access. */
export async function grantChatAccess(db: D1Database, cookies: AstroCookies, id: number) {
  let token = cookies.get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  }
  await db.prepare("INSERT OR REPLACE INTO chat_visitor_sessions (conversation_id, token, expires_at) VALUES (?, ?, datetime('now', '+30 days'))")
    .bind(id, token).run();
  cookies.set(COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: LIFETIME });
}

export async function hasChatAccess(db: D1Database, cookies: AstroCookies, id: number) {
  const token = cookies.get(COOKIE)?.value;
  if (!token || !Number.isSafeInteger(id) || id <= 0) return false;
  return !!await db.prepare("SELECT conversation_id FROM chat_visitor_sessions WHERE conversation_id = ? AND token = ? AND expires_at > datetime('now')")
    .bind(id, token).first();
}
