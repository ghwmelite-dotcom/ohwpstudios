#!/usr/bin/env node
/**
 * Post-deploy smoke test. Usage: node scripts/smoke-test.mjs [baseUrl]
 * Exits non-zero if any check fails — CI treats that as a failed deploy.
 */
const base = (process.argv[2] || 'https://ohwpstudios.org').replace(/\/$/, '');

const checks = [
  { path: '/', mustContain: 'OhWP' },
  { path: '/estimate-project', mustContain: 'estimate' },
  { path: '/api/page-init' }, // exercises a Pages Function + D1
];

let failed = 0;
for (const check of checks) {
  const url = base + check.path;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (res.status !== 200) {
      console.error(`FAIL ${url} — status ${res.status}`);
      failed++;
      continue;
    }
    if (check.mustContain) {
      const body = await res.text();
      if (!body.toLowerCase().includes(check.mustContain.toLowerCase())) {
        console.error(`FAIL ${url} — missing sentinel "${check.mustContain}"`);
        failed++;
        continue;
      }
    }
    console.log(`OK   ${url}`);
  } catch (err) {
    console.error(`FAIL ${url} — ${err.message}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} smoke check(s) failed`);
  process.exit(1);
}
console.log('\nAll smoke checks passed');
