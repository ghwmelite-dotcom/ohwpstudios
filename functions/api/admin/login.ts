// Admin login API endpoint
interface LoginRequest {
  username: string;
  password: string;
}

// Generate session token
function generateToken(): string {
  return `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Simple password hashing function (matches change-password.ts)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  try {
    const body = await request.json() as LoginRequest;
    const { username, password } = body;

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Check database for user
    if (!env?.DB) {
      // Fallback to hardcoded credentials if database not available (development only)
      if (username === 'admin' && password === 'admin123') {
        const token = generateToken();
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
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    } else {
      // Query database for user
      const user = await env.DB.prepare('SELECT * FROM admin_users WHERE username = ?')
        .bind(username)
        .first();

      if (user) {
        // Hash the provided password and compare
        const passwordHash = await hashPassword(password);

        if (user.password_hash === passwordHash) {
          // Update last login
          await env.DB.prepare('UPDATE admin_users SET last_login = datetime(\'now\') WHERE id = ?')
            .bind(user.id)
            .run();

          // Generate session token
          const token = generateToken();

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
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid username or password' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  } catch (error) {
    console.error('Login error:', error);
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

