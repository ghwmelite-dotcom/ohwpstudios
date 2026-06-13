import type { APIRoute } from 'astro';
import {
  verifyPassword,
  hashPassword,
  generateSessionToken,
  SESSION_COOKIE,
  SESSION_HOURS,
} from '@/lib/admin-auth';
import { generateCSRFToken } from '@/utils/csrf';
import { rateLimitMiddleware, getClientIdentifier, RATE_LIMITS, clearRateLimit } from '@/utils/rate-limit';
import { getCORSHeaders } from '@/utils/cors';

export const prerender = false;

// Fixed dummy hash (password "x", discarded result): equalizes timing between
// unknown-user and wrong-password so usernames can't be enumerated.
const DUMMY_HASH = 'pbkdf2$100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    // Apply rate limiting based on IP address
    const clientIP = getClientIdentifier(request);
    const rateLimitResponse = await rateLimitMiddleware(clientIP, RATE_LIMITS.LOGIN);
    if (rateLimitResponse) {
      return rateLimitResponse; // Rate limit exceeded
    }

    const body = await request.json();
    const username = body.username;
    const password = body.password;

    if (!username || !password) {
      return json({ success: false, error: 'Username and password are required' }, 400);
    }

    // Database access (runtime.env.DB from Cloudflare)
    const db = (locals as { runtime?: { env?: { DB?: D1Database } } }).runtime?.env?.DB;
    if (!db) {
      return json({ success: false, error: 'Database service unavailable' }, 503);
    }

    const user = await db
      .prepare('SELECT id, username, password_hash FROM admin_users WHERE username = ?')
      .bind(username)
      .first<{ id: number; username: string; password_hash: string }>();
    // Identical message + status for unknown user and wrong password — never
    // reveal which one failed. Run a discarded PBKDF2 verify first so the
    // unknown-user path takes the same wall-clock time as the wrong-password
    // path (prevents username enumeration via timing).
    if (!user) {
      await verifyPassword(password, DUMMY_HASH);
      return json({ success: false, error: 'Invalid credentials' }, 401);
    }

    const { valid, needsRehash } = await verifyPassword(password, String(user.password_hash));
    if (!valid) {
      return json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Transparent migration: re-hash legacy unsalted SHA-256 hashes to PBKDF2
    // now that we hold the plaintext.
    if (needsRehash) {
      const newHash = await hashPassword(password);
      await db
        .prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?')
        .bind(newHash, user.id)
        .run();
    }

    // Prune this user's expired sessions before issuing a new one.
    await db
      .prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at <= datetime('now')")
      .bind(user.id)
      .run();

    const token = generateSessionToken();
    const csrfToken = generateCSRFToken();
    await db
      .prepare(
        "INSERT INTO sessions (token, user_id, csrf_token, created_at, expires_at) VALUES (?, ?, ?, datetime('now'), datetime('now', ?))"
      )
      .bind(token, user.id, csrfToken, `+${SESSION_HOURS} hours`)
      .run();
    await db
      .prepare("UPDATE admin_users SET last_login = datetime('now') WHERE id = ?")
      .bind(user.id)
      .run();

    // Clear rate limit after successful login
    clearRateLimit(clientIP);

    // Session lives in an HttpOnly cookie only — never in the response body.
    // `secure: true` is safe in local dev: modern browsers treat localhost as
    // a trustworthy origin and accept Secure cookies over http there.
    cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_HOURS * 3600,
    });

    return json({ success: true, username: user.username, csrf_token: csrfToken }, 200);
  } catch (error) {
    console.error('Login error:', error);
    return json({ success: false, error: 'Internal server error' }, 500);
  }
};

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(request, {
      methods: ['POST', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization']
    })
  });
};
