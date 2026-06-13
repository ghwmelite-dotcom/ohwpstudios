/**
 * Primitives for secure contract access + email-OTP signing.
 * Token = unguessable URL secret. Code = short-lived 6-digit email OTP.
 */

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 32-hex unguessable share token for /contract/<token>. */
export function generateShareToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/** 6-digit numeric OTP (leading zeros preserved). */
export function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, '0');
}

export async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return toHex(new Uint8Array(digest));
}

/** Timing-safe equality for equal-length hex hashes. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const CODE_TTL_MIN = 10;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SEC = 60;
export const MAX_CODES_PER_HOUR = 6;
