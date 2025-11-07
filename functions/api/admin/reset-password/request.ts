// Password reset request API endpoint
interface ResetRequest {
  username: string;
}

// Generate reset token
function generateResetToken(): string {
  const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `reset-${Date.now()}-${randomPart}`;
}

export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  try {
    const body = await request.json() as ResetRequest;
    const { username } = body;

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // For development, only allow 'admin' username
    if (username !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Generate reset token
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // In production, save token to D1 database
    // For development, we'll just return the token
    if (env?.DB) {
      try {
        await env.DB.prepare(
          'INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES (?, ?, ?, 0)'
        ).bind(1, token, expiresAt.toISOString()).run();
      } catch (dbError) {
        console.log('Database not available, using development mode');
      }
    }

    // Store token temporarily in memory for development
    // In production, this would be sent via email
    return new Response(
      JSON.stringify({
        success: true,
        token: token,
        message: 'Password reset token generated. Please use it within 1 hour.',
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
    console.error('Password reset request error:', error);
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
