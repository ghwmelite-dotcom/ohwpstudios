// CSRF Protection Utility
// Generates and validates CSRF tokens for state-changing operations

/**
 * Generate a secure CSRF token
 * @returns A cryptographically secure random token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token from request
 * @param token Token from request header or body
 * @param sessionToken Token stored in session
 * @returns True if tokens match, false otherwise
 */
export function validateCSRFToken(token: string | null, sessionToken: string | null): boolean {
  if (!token || !sessionToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (token.length !== sessionToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ sessionToken.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Middleware to verify CSRF token for state-changing requests
 * @param request The incoming request
 * @param expectedToken The expected CSRF token from session
 * @returns Response with 403 if invalid, null if valid
 */
export async function verifyCSRFToken(
  request: Request,
  expectedToken: string | null
): Promise<Response | null> {
  // Only check CSRF for state-changing methods
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null; // GET, HEAD, OPTIONS don't need CSRF
  }

  // Get CSRF token from header or body
  let csrfToken = request.headers.get('X-CSRF-Token');

  if (!csrfToken) {
    // Try to get from body for form submissions
    try {
      const contentType = request.headers.get('Content-Type');
      if (contentType?.includes('application/json')) {
        const body = await request.json();
        csrfToken = body.csrfToken || body.csrf_token;
      }
    } catch {
      // If body parsing fails, continue with header check
    }
  }

  if (!validateCSRFToken(csrfToken, expectedToken)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid or missing CSRF token'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return null; // Valid token, continue
}
