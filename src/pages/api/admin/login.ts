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
    const body = await request.json();
    const username = body.username;
    const password = body.password;

    console.log('Login attempt:', username);

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Check if we have database access (runtime.env.DB from Cloudflare)
    const DB = (locals as any).runtime?.env?.DB;

    if (!DB) {
      // Dev mode fallback - use hardcoded credentials
      if (username === 'admin' && password === 'admin123') {
        const token = `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('✅ Login successful (dev mode)');

        return new Response(
          JSON.stringify({
            success: true,
            token: token,
            user: { username: 'admin', email: 'admin@yoursite.com' },
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    } else {
      // Production mode - check database
      const user = await DB.prepare('SELECT * FROM admin_users WHERE username = ?')
        .bind(username)
        .first();

      if (user) {
        // Hash the provided password and compare
        const passwordHash = await hashPassword(password);

        if (user.password_hash === passwordHash) {
          // Update last login
          await DB.prepare('UPDATE admin_users SET last_login = datetime(\'now\') WHERE id = ?')
            .bind(user.id)
            .run();

          // Generate token
          const token = `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Create session in database (expires in 7 days)
          await DB.prepare(
            'INSERT INTO sessions (user_id, token, created_at, expires_at) VALUES (?, ?, datetime(\'now\'), datetime(\'now\', \'+7 days\'))'
          ).bind(user.id, token).run();

          console.log('✅ Login successful, session created');

          return new Response(
            JSON.stringify({
              success: true,
              token: token,
              user: { username: user.username, email: user.email },
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        }
      }
    }

    console.log('❌ Invalid credentials');

    return new Response(
      JSON.stringify({ error: 'Invalid username or password' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

