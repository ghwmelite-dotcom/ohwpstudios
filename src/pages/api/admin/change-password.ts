import type { APIRoute } from 'astro';

export const prerender = false;

// Simple password hashing function (matches the one in functions/api/admin)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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

    // Check if we have database access (runtime.env.DB from Cloudflare)
    const DB = (locals as any).runtime?.env?.DB;

    if (!DB) {
      // Dev mode fallback - just validate current password and show success
      // In dev, the default password is 'admin123'
      if (currentPassword !== 'admin123') {
        return new Response(
          JSON.stringify({ error: 'Current password is incorrect' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('✅ Password would be changed to:', newPassword);
      console.log('⚠️  Note: In dev mode, password changes are not persisted');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Password updated successfully (dev mode - not persisted)',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Production mode - update database
    const user = await DB.prepare('SELECT * FROM admin_users WHERE id = 1').first();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify current password
    const currentPasswordHash = await hashPassword(currentPassword);
    if (user.password_hash !== currentPasswordHash) {
      return new Response(
        JSON.stringify({ error: 'Current password is incorrect' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Hash and update new password
    const newPasswordHash = await hashPassword(newPassword);
    await DB.prepare('UPDATE admin_users SET password_hash = ? WHERE id = 1')
      .bind(newPasswordHash)
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
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
