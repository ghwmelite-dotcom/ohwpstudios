#!/usr/bin/env node
// Usage: node scripts/hash-password.mjs <password>
// Prints a pbkdf2$... hash for seeding/updating admin_users.
const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs <password>');
  process.exit(1);
}
const ITER = 100_000;
const toHex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, key, 256));
console.log(`pbkdf2$${ITER}$${toHex(salt)}$${toHex(bits)}`);
console.log('\nSeed locally with:');
console.log(`npx wrangler d1 execute agency-db --local --command "INSERT OR REPLACE INTO admin_users (id, username, password_hash, email) VALUES (1, 'admin', '<hash-above>', 'ohwpstudios@gmail.com');"`);
