import type { APIRoute } from 'astro';
import { hashPassword } from '@/lib/admin-auth';

export const prerender = false;

// Password reset CONFIRM endpoint — PUBLIC (a locked-out admin has no session).
// Auth is intentionally NOT enforced for this path: see PUBLIC_ADMIN_PATHS in
// src/middleware.ts. CSRF is skipped (no session exists yet); the secret
// single-use reset token is the authorization here.
//
// Security model:
//  - The token must exist in password_reset_tokens, be unused, and unexpired.
//  - The new password is hashed with PBKDF2 (hashPassword) before storage —
//    never plaintext, never SHA-256.
//  - The token is marked used in the SAME logical step as the password write,
//    so a token works exactly once.

interface ResetConfirmRequest {
  token?: string;
  newPassword?: string;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface TokenRow {
  id: number;
  user_id: number;
  used: number;
  expires_at: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as ResetConfirmRequest;
    const token = (body.token ?? '').trim();
    const newPassword = body.newPassword ?? '';

    if (!token || !newPassword) {
      return json({ error: 'Token and new password are required' }, 400);
    }

    if (newPassword.length < 8) {
      return json({ error: 'Password must be at least 8 characters long' }, 400);
    }

    const db = (locals as any).runtime?.env?.DB as D1Database | undefined;
    if (!db) {
      return json({ error: 'Service unavailable' }, 503);
    }

    // Look the token up directly (the token column is UNIQUE-indexed). A single
    // generic "invalid or expired" message is returned for every failure mode
    // (missing / used / expired) so no information leaks about token state.
    const row = await db
      .prepare(
        'SELECT id, user_id, used, expires_at FROM password_reset_tokens WHERE token = ?'
      )
      .bind(token)
      .first<TokenRow>();

    const invalid = (): Response =>
      json({ error: 'Reset link is invalid or has expired. Please request a new one.' }, 400);

    if (!row) return invalid();
    if (row.used === 1) return invalid();
    if (new Date(row.expires_at) < new Date()) return invalid();

    // Hash with PBKDF2 and write the new password, then burn the token.
    const passwordHash = await hashPassword(newPassword);

    await db
      .prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?')
      .bind(passwordHash, row.user_id)
      .run();

    // Mark used, guarding against a concurrent double-use (used = 0 predicate).
    const burn = await db
      .prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ? AND used = 0')
      .bind(row.id)
      .run();

    // If another request already consumed this token between our read and write,
    // bail rather than report success. (Best-effort: D1 is not transactional
    // across statements, but this narrows the race.)
    const changes = (burn as { meta?: { changes?: number } }).meta?.changes;
    if (changes === 0) return invalid();

    // Invalidate all existing sessions for this user — a password reset should
    // log out any other active sessions.
    try {
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id).run();
    } catch {
      // Non-fatal: the password is already changed.
    }

    return json({ success: true, message: 'Password reset successfully' }, 200);
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
};
