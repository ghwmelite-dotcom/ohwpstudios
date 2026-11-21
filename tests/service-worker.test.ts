import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function worker() {
  const listeners = new Map<string, (event: unknown) => void>();
  let networkCalls = 0;
  let cacheReads = 0;
  const removed: string[] = [];
  const scope = {
    location: { origin: 'https://ohwpstudios.org' }, URL, Request, Response,
    console: { log() {} },
    self: { addEventListener: (name: string, handler: (event: unknown) => void) => listeners.set(name, handler), clients: { claim: async () => {} } },
    fetch: async () => { networkCalls++; return new Response('current release'); },
    caches: {
      open: async () => ({
        match: async () => { cacheReads++; return new Response('old cached homepage'); },
        put: async () => {},
      }),
      keys: async () => ['static-v1.3.0', 'api-v1.3.0', 'static-v1.4.0', 'another-app-cache'],
      delete: async (name: string) => { removed.push(name); return true; },
    },
  };
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), scope);
  async function request(path: string, mode = 'navigate') {
    let response: Promise<Response> | undefined;
    listeners.get('fetch')?.({ request: { url: scope.location.origin + path, mode, method: 'GET' },
      respondWith: (pending: Promise<Response>) => { response = pending; } });
    return response;
  }
  return { listeners, request, removed, counts: () => ({ networkCalls, cacheReads }) };
}

describe('service worker release freshness', () => {
  test('public navigation fetches the current release instead of an old cached homepage', async () => {
    const sw = worker();
    expect(await (await sw.request('/'))?.text()).toBe('current release');
    expect(sw.counts()).toEqual({ networkCalls: 1, cacheReads: 0 });
  });
  test('private pages and APIs use browser networking without an offline cache fallback', async () => {
    const sw = worker();
    for (const path of ['/api/portfolio', '/api/admin/contacts', '/admin', '/client', '/contract/private-token', '/proposal/private-token']) {
      expect(await sw.request(path)).toBeUndefined();
    }
    expect(sw.counts()).toEqual({ networkCalls: 0, cacheReads: 0 });
  });
  test('immutable assets retain cache-first behaviour', async () => {
    const sw = worker();
    expect(await (await sw.request('/_astro/app.hash.css', 'cors'))?.text()).toBe('old cached homepage');
    expect(sw.counts()).toEqual({ networkCalls: 0, cacheReads: 1 });
  });
  test('activation removes old application caches while retaining unrelated caches', async () => {
    const sw = worker();
    let completion: Promise<unknown> | undefined;
    sw.listeners.get('activate')?.({ waitUntil: (pending: Promise<unknown>) => { completion = pending; } });
    await completion;
    expect(sw.removed).toEqual(['static-v1.3.0', 'api-v1.3.0']);
  });
});
