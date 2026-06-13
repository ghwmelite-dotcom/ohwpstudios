#!/usr/bin/env node
/**
 * Post-deploy smoke test. Usage: node scripts/smoke-test.mjs [baseUrl]
 * Exits non-zero if any check fails — CI treats that as a failed deploy.
 */
const base = (process.argv[2] || 'https://ohwpstudios.org').replace(/\/$/, '');

const checks = [
  { path: '/', mustContain: 'OhWP' },
  { path: '/estimate-project', mustContain: 'estimate' },
  { path: '/api/page-init', contentType: 'application/json' }, // exercises a Pages Function + D1
  // Guards against the functions/-directory regression class: route must exist and validate.
  { path: '/api/booking', method: 'POST', body: '{}', expectStatus: 400, contentType: 'application/json' },
  // The admin wall must exist forever: unauthenticated admin API = 401, not a PII leak.
  { path: '/api/admin/contacts', expectStatus: 401, contentType: 'application/json' },
];

async function fetchWithRetry(url, opts, retries = 1, delayMs = 3000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, opts);
    } catch (err) {
      if (attempt === retries) throw err;
      console.error(`RETRY ${url} — ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

let failed = 0;
for (const check of checks) {
  const url = base + check.path;
  console.log(`CHECK ${url}`);
  try {
    const res = await fetchWithRetry(url, {
      method: check.method || 'GET',
      headers: check.body ? { 'Content-Type': 'application/json' } : undefined,
      body: check.body,
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });
    const wantStatus = check.expectStatus ?? 200;
    if (res.status !== wantStatus) {
      console.error(`FAIL ${url} — status ${res.status} (expected ${wantStatus})`);
      failed++;
      continue;
    }
    if (check.contentType) {
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes(check.contentType)) {
        console.error(`FAIL ${url} — content-type "${ct}" missing "${check.contentType}"`);
        failed++;
        continue;
      }
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
