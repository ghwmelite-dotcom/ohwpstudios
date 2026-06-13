import type { APIRoute } from 'astro';
import { sendEmail, emailShell, emailButton, escapeHtml } from '@/lib/email';

export const prerender = false;

// Password reset REQUEST endpoint — PUBLIC (a locked-out admin has no session).
// Auth is intentionally NOT enforced for this path: see PUBLIC_ADMIN_PATHS in
// src/middleware.ts. CSRF is also skipped (no session exists yet).
//
// Security model:
//  - Crypto-random, single-use, 1-hour token stored in password_reset_tokens.
//  - The token is emailed as a link to /admin/reset-password/confirm?token=...
//    and is NEVER returned in the response body.
//  - The response is identical whether or not the account exists, so this
//    endpoint cannot be used to enumerate usernames/emails.

interface ResetRequest {
  username?: string;
}

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const SITE_ORIGIN = 'https://ohwpstudios.org';

/** 256-bit crypto-random token, hex-encoded. */
function generateResetToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Generic response returned in ALL non-error cases so the caller cannot tell
// whether the account exists.
const GENERIC_OK = {
  success: true,
  message:
    'If an account matches that username, a password reset link has been sent to its email address.',
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as ResetRequest;
    const username = (body.username ?? '').trim();

    if (!username) {
      return json({ success: false, error: 'Username is required' }, 400);
    }

    const env = (locals as any).runtime?.env as
      | { DB?: D1Database; RESEND_API_KEY?: string }
      | undefined;
    const db = env?.DB;
    if (!db) {
      return json({ success: false, error: 'Service unavailable' }, 503);
    }

    // Look up the user. Match by username OR email so either identifier works.
    const user = await db
      .prepare('SELECT id, username, email FROM admin_users WHERE username = ? OR email = ?')
      .bind(username, username)
      .first<{ id: number; username: string; email: string }>();

    // If the user exists, mint + store a token and email the link. All failures
    // past this point are swallowed: we never reveal whether the account exists,
    // and we never surface email-delivery errors to an unauthenticated caller.
    if (user) {
      try {
        const token = generateResetToken();
        const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();

        // Invalidate any outstanding tokens for this user before issuing a new
        // one (one live reset link at a time).
        await db
          .prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0')
          .bind(user.id)
          .run();

        await db
          .prepare(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES (?, ?, ?, 0)'
          )
          .bind(user.id, token, expiresAt)
          .run();

        const link = `${SITE_ORIGIN}/admin/reset-password/confirm?token=${encodeURIComponent(token)}`;
        const html = emailShell(
          'Reset your password',
          `<p>Hi ${escapeHtml(user.username)},</p>
           <p>We received a request to reset the password for your OhWP Studios admin account. Click the button below to choose a new password. This link expires in 1 hour and can be used once.</p>
           ${emailButton(link, 'Reset password')}
           <p style="color:#8a7d68;font-size:13px;">If you did not request this, you can safely ignore this email — your password will not change.</p>
           <p style="color:#8a7d68;font-size:12px;word-break:break-all;">Or paste this link into your browser:<br>${escapeHtml(link)}</p>`
        );

        await sendEmail(env!, {
          to: user.email,
          subject: 'Reset your OhWP Studios admin password',
          html,
        });
      } catch (innerError) {
        // Log server-side, but still return the generic success below.
        console.error('Password reset request (post-lookup) error:', innerError);
      }
    }

    return json(GENERIC_OK, 200);
  } catch (error) {
    console.error('Password reset request error:', error);
    return json({ success: false, error: 'Internal server error' }, 500);
  }
};
