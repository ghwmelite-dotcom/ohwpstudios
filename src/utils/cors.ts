// CORS Utility
// Provides secure CORS headers restricted to allowed origins

// Allowed origins for CORS requests
const ALLOWED_ORIGINS = [
  'https://ohwpstudios.org',
  'https://www.ohwpstudios.org',
  'https://ohwpstudios.pages.dev',
  // Add any other production domains here
];

// In development, allow localhost
if (import.meta.env.DEV) {
  ALLOWED_ORIGINS.push(
    'http://localhost:4321',
    'http://localhost:3000',
    'http://127.0.0.1:4321',
    'http://127.0.0.1:3000'
  );
}

/**
 * Get CORS headers for a request
 * @param request The incoming request
 * @param options Additional CORS options
 * @returns Headers object with appropriate CORS settings
 */
export function getCORSHeaders(
  request: Request,
  options: {
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  } = {}
): Record<string, string> {
  const origin = request.headers.get('Origin') || '';

  const {
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials = true
  } = options;

  // Check if origin is allowed
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Allow-Headers': headers.join(', '),
    'Access-Control-Allow-Credentials': credentials ? 'true' : 'false',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handle CORS preflight requests
 * @param request The incoming request
 * @returns Response for OPTIONS request or null if not OPTIONS
 */
export function handleCORSPreflight(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCORSHeaders(request)
    });
  }
  return null;
}

/**
 * Check if origin is allowed
 * @param request The incoming request
 * @returns True if origin is allowed, false otherwise
 */
export function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // Same-origin requests don't have Origin header
  return ALLOWED_ORIGINS.includes(origin);
}
