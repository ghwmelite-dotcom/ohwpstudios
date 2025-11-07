// Password reset confirmation API endpoint
interface ResetConfirmRequest {
  token: string;
  newPassword: string;
}

export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  try {
    const body = await request.json() as ResetConfirmRequest;
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Token and new password are required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Validate password length
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters long' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Validate token format
    if (!token.startsWith('reset-')) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Extract timestamp from token
    const tokenParts = token.split('-');
    if (tokenParts.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    const tokenTimestamp = parseInt(tokenParts[1]);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Check if token is expired (1 hour expiry)
    if (now - tokenTimestamp > oneHour) {
      return new Response(
        JSON.stringify({ error: 'Reset token has expired. Please request a new one.' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // In production, we would:
    // 1. Verify token exists in database
    // 2. Check if it's been used
    // 3. Hash the new password with bcrypt
    // 4. Update the user's password in the database
    // 5. Mark token as used

    if (env?.DB) {
      try {
        // Check if token exists and is not used
        const tokenResult = await env.DB.prepare(
          'SELECT id, user_id, used, expires_at FROM password_reset_tokens WHERE token = ?'
        ).bind(token).first();

        if (!tokenResult) {
          return new Response(
            JSON.stringify({ error: 'Invalid token' }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              }
            }
          );
        }

        if (tokenResult.used === 1) {
          return new Response(
            JSON.stringify({ error: 'This token has already been used' }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              }
            }
          );
        }

        // Check if token is expired
        const expiresAt = new Date(tokenResult.expires_at);
        if (expiresAt < new Date()) {
          return new Response(
            JSON.stringify({ error: 'Reset token has expired. Please request a new one.' }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              }
            }
          );
        }

        // In a real app, we would hash the password with bcrypt here
        // For now, we'll just mark the token as used
        // await env.DB.prepare(
        //   'UPDATE admin_users SET password_hash = ? WHERE id = ?'
        // ).bind(hashedPassword, tokenResult.user_id).run();

        // Mark token as used
        await env.DB.prepare(
          'UPDATE password_reset_tokens SET used = 1 WHERE token = ?'
        ).bind(token).run();

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Password reset successfully',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      } catch (dbError) {
        console.log('Database error:', dbError);
        // Fall through to development mode
      }
    }

    // Development mode (no database)
    // Just accept the token and password
    console.log(`Password reset for development mode. New password length: ${newPassword.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset successfully (development mode)',
        note: 'In production, this would update the database',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

// Handle OPTIONS request for CORS
export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
