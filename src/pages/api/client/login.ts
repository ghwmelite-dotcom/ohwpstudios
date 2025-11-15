import type { APIRoute } from 'astro';
import { generateCSRFToken } from '@/utils/csrf';
import { rateLimitMiddleware, getClientIdentifier, RATE_LIMITS, clearRateLimit } from '@/utils/rate-limit';

export const prerender = false;

// Simple password hashing function (matches admin pattern)
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
    // Apply rate limiting based on IP address
    const clientIP = getClientIdentifier(request);
    const rateLimitResponse = await rateLimitMiddleware(clientIP, RATE_LIMITS.LOGIN);
    if (rateLimitResponse) {
      return rateLimitResponse; // Rate limit exceeded
    }

    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find client user
    const user = await db
      .prepare('SELECT * FROM client_users WHERE email = ? AND status = "active"')
      .bind(email.toLowerCase())
      .first();

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash the provided password and compare
    const passwordHash = await hashPassword(password);
    if (user.password_hash !== passwordHash) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate token and CSRF token
    const token = crypto.randomUUID();
    const csrfToken = generateCSRFToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    // Update user with token and CSRF token
    await db
      .prepare('UPDATE client_users SET token = ?, csrf_token = ?, token_expires_at = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(token, csrfToken, expiresAt.toISOString(), user.id)
      .run();

    // Clear rate limit after successful login
    clearRateLimit(clientIP);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        csrfToken,
        user: {
          id: user.id,
          email: user.email,
          company_name: user.company_name,
          contact_name: user.contact_name
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Client login error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Login failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
