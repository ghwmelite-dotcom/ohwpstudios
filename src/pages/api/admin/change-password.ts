import type { APIRoute } from 'astro';
import { handleCORSPreflight } from '@/utils/cors';
import { hashPassword, verifyPassword, SESSION_COOKIE } from '../../../lib/admin-auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const body = await request.json();
    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword;

    if (!currentPassword || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Current password and new password are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'New password must be at least 8 characters long' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const DB = locals.runtime?.env?.DB;
    if (!DB) {
      // No DB means no way to verify or persist anything — fail closed.
      return new Response(
        JSON.stringify({ error: 'Service unavailable' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Identity comes from the session-backed middleware guard, never the request.
    const adminUser = locals.adminUser;
    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const user = await DB.prepare('SELECT id, password_hash FROM admin_users WHERE id = ?')
      .bind(adminUser.id)
      .first();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify current password (supports legacy and pbkdf2 formats)
    const { valid } = await verifyPassword(currentPassword, String(user.password_hash));
    if (!valid) {
      return new Response(
        JSON.stringify({ error: 'Current password is incorrect' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Hash with salted PBKDF2 and persist
    const newPasswordHash = await hashPassword(newPassword);
    await DB.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?')
      .bind(newPasswordHash, adminUser.id)
      .run();

    // Invalidate every OTHER session for this user — a password change must
    // log out anyone else holding a session, but keep the current one alive.
    const currentToken = cookies.get(SESSION_COOKIE)?.value ?? '';
    await DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?')
      .bind(adminUser.id, currentToken)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password updated successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Change password error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update password',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const OPTIONS: APIRoute = async (context) => {
  const preflightResponse = handleCORSPreflight(context.request);
  if (preflightResponse) {
    return preflightResponse;
  }
  return new Response(null, { status: 405 });
};
