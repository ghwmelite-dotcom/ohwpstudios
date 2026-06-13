/**
 * Admin authentication primitives: PBKDF2 password hashing (with transparent
 * migration from the legacy unsalted SHA-256 format) and session helpers.
 * The middleware owns enforcement; this module owns crypto.
 */

const PBKDF2_ITERATIONS = 100_000;
export const SESSION_COOKIE = 'admin_session';
export const SESSION_HOURS = 24;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Constant-time comparison of equal-length strings (hex/token material). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function pbkdf2Bits(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2Bits(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

/** Verifies against PBKDF2 format or the legacy unsalted SHA-256 (64-hex). */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (stored.startsWith('pbkdf2$')) {
    const [, iterStr, saltHex, hashHex] = stored.split('$');
    const hash = await pbkdf2Bits(password, fromHex(saltHex), Number(iterStr));
    return { valid: timingSafeEqual(toHex(hash), hashHex), needsRehash: false };
  }
  // legacy: unsalted SHA-256 hex
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)));
  return { valid: timingSafeEqual(toHex(digest), stored.toLowerCase()), needsRehash: true };
}

/** 256-bit random session token, hex-encoded. */
export function generateSessionToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}
