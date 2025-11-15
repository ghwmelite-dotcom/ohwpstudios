// Rate Limiting Utility
// Prevents brute force attacks on sensitive endpoints

interface RateLimitConfig {
  maxAttempts: number;  // Maximum attempts allowed
  windowMs: number;     // Time window in milliseconds
  blockDurationMs: number; // How long to block after exceeding limit
}

interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

// Default configurations for different endpoint types
export const RATE_LIMITS = {
  LOGIN: {
    maxAttempts: 5,           // 5 attempts
    windowMs: 15 * 60 * 1000, // per 15 minutes
    blockDurationMs: 30 * 60 * 1000 // block for 30 minutes
  },
  API: {
    maxAttempts: 100,         // 100 requests
    windowMs: 60 * 1000,      // per minute
    blockDurationMs: 5 * 60 * 1000 // block for 5 minutes
  },
  PAYMENT: {
    maxAttempts: 3,           // 3 attempts
    windowMs: 60 * 60 * 1000, // per hour
    blockDurationMs: 60 * 60 * 1000 // block for 1 hour
  }
};

/**
 * Check if request exceeds rate limit
 * Uses in-memory storage (works for single instance)
 * For production with multiple instances, use Cloudflare KV or Durable Objects
 */
const rateLimitStore = new Map<string, RateLimitRecord>();

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.API
): Promise<{ allowed: boolean; retryAfter?: number; remaining?: number }> {
  const now = Date.now();
  const key = identifier;

  // Get existing record
  let record = rateLimitStore.get(key);

  // Clean up old records (garbage collection)
  if (record && now - record.firstAttempt > config.windowMs) {
    rateLimitStore.delete(key);
    record = undefined;
  }

  // Check if currently blocked
  if (record?.blockedUntil && now < record.blockedUntil) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.blockedUntil - now) / 1000) // seconds
    };
  }

  // Create new record if doesn't exist
  if (!record || (record.blockedUntil && now >= record.blockedUntil)) {
    record = {
      attempts: 1,
      firstAttempt: now
    };
    rateLimitStore.set(key, record);

    return {
      allowed: true,
      remaining: config.maxAttempts - 1
    };
  }

  // Increment attempts
  record.attempts++;

  // Check if exceeded limit
  if (record.attempts > config.maxAttempts) {
    record.blockedUntil = now + config.blockDurationMs;
    rateLimitStore.set(key, record);

    return {
      allowed: false,
      retryAfter: Math.ceil(config.blockDurationMs / 1000)
    };
  }

  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: config.maxAttempts - record.attempts
  };
}

/**
 * Middleware to apply rate limiting to an endpoint
 * @param identifier Unique identifier (IP, email, user ID)
 * @param config Rate limit configuration
 * @returns Response with 429 if rate limited, null if allowed
 */
export async function rateLimitMiddleware(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.API
): Promise<Response | null> {
  const result = await checkRateLimit(identifier, config);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: result.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': result.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': config.maxAttempts.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil((Date.now() + (result.retryAfter || 60) * 1000) / 1000).toString()
        }
      }
    );
  }

  return null; // Allowed, continue
}

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from Cloudflare headers
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) return cfIP;

  // Fallback to X-Forwarded-For
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0].trim();
  }

  // Fallback to X-Real-IP
  const realIP = request.headers.get('X-Real-IP');
  if (realIP) return realIP;

  // Last resort: use a generic identifier
  return 'unknown';
}

/**
 * Clear rate limit for an identifier (useful after successful login)
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}
