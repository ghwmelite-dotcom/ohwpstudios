import { defineMiddleware } from 'astro:middleware';
import * as Sentry from '@sentry/cloudflare';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  setAsyncContextStrategy,
  getDefaultCurrentScope,
  getDefaultIsolationScope,
  type Scope,
} from '@sentry/core';

type WorkersExecutionContext = import('@cloudflare/workers-types').ExecutionContext;

// Statically inlined at build time, so changing it requires a rebuild. When
// unset (local dev), the entire Sentry path below is dead code and tree-shakes
// out of the server bundle.
const SENTRY_DSN = import.meta.env.PUBLIC_SENTRY_DSN;

interface SentryScopes {
  scope: Scope;
  isolationScope: Scope;
}

/**
 * Registers Sentry's AsyncLocalStorage-based async context strategy.
 *
 * `wrapRequestHandler` in @sentry/cloudflare@8.55.x does NOT register this
 * itself (only `withSentry`/`sentryPagesPlugin` do, via an internal helper
 * that is not exported from the package root). Without it, all concurrent
 * requests in an isolate share one global scope: events get the wrong
 * request metadata and breadcrumbs accumulate across requests.
 *
 * Faithful replica of the SDK's own implementation at
 * node_modules/@sentry/cloudflare/build/esm/async.js
 * (setAsyncLocalStorageAsyncContextStrategy).
 */
function setupSentryAsyncContext(): void {
  const asyncStorage = new AsyncLocalStorage<SentryScopes>();

  function getScopes(): SentryScopes {
    const scopes = asyncStorage.getStore();

    if (scopes) {
      return scopes;
    }

    // Fallback: if we can't find scopes on the async context, use the
    // global defaults (same behavior as the SDK's implementation).
    return {
      scope: getDefaultCurrentScope(),
      isolationScope: getDefaultIsolationScope(),
    };
  }

  setAsyncContextStrategy({
    withScope<T>(callback: (scope: Scope) => T): T {
      const scope = getScopes().scope.clone();
      const isolationScope = getScopes().isolationScope;
      return asyncStorage.run({ scope, isolationScope }, () => callback(scope));
    },
    withSetScope<T>(scope: Scope, callback: (scope: Scope) => T): T {
      const isolationScope = getScopes().isolationScope.clone();
      return asyncStorage.run({ scope, isolationScope }, () => callback(scope));
    },
    withIsolationScope<T>(callback: (isolationScope: Scope) => T): T {
      const scope = getScopes().scope;
      const isolationScope = getScopes().isolationScope.clone();
      return asyncStorage.run({ scope, isolationScope }, () => callback(isolationScope));
    },
    withSetIsolationScope<T>(isolationScope: Scope, callback: (isolationScope: Scope) => T): T {
      const scope = getScopes().scope;
      return asyncStorage.run({ scope, isolationScope }, () => callback(isolationScope));
    },
    getCurrentScope: () => getScopes().scope,
    getIsolationScope: () => getScopes().isolationScope,
  });
}

// Once per isolate, before any request is handled. Requires the
// nodejs_compat flag (wrangler.toml) for node:async_hooks.
if (SENTRY_DSN) {
  setupSentryAsyncContext();
}

/**
 * Captures unhandled exceptions from API routes into Sentry.
 * - Only wraps /api/* (page rendering stays untouched).
 * - No-ops entirely when PUBLIC_SENTRY_DSN is unset (local dev).
 * - PII: request bodies, cookies, headers, and query strings are stripped in
 *   beforeSend; contact/estimate/careers submissions must never reach Sentry.
 *
 * Verified against the installed @sentry/cloudflare@8.55.x:
 * wrapRequestHandler({ options, request, context }, handler) re-throws after
 * captureException, so error response behavior is unchanged, and it tolerates
 * an undefined execution context (e.g. during prerendering).
 */
export const onRequest = defineMiddleware((context, next) => {
  if (!SENTRY_DSN || !context.url.pathname.startsWith('/api/')) {
    return next();
  }

  // Astro's Cloudflare adapter exposes the Workers execution context here.
  // The adapter does not export this shape, so type it structurally.
  const runtime = (context.locals as { runtime?: { ctx?: WorkersExecutionContext } }).runtime;

  return Sentry.wrapRequestHandler(
    {
      options: {
        dsn: SENTRY_DSN,
        release: import.meta.env.PUBLIC_COMMIT_SHA || 'dev',
        sendDefaultPii: false,
        sampleRate: 1.0, // capture all errors; volume is low
        tracesSampleRate: 0, // no performance tracing this phase
        tracePropagationTargets: [], // no sentry-trace/baggage headers on outbound calls (Paystack, AI providers)
        beforeSend(event) {
          if (event.request) {
            delete event.request.data;
            delete event.request.cookies;
            delete event.request.headers;
            delete event.request.query_string;
            // Same trapdoor as the client SDK: query strings can carry live
            // tokens (e.g. /api/newsletter/confirm?token=…).
            if (event.request.url) event.request.url = event.request.url.split('?')[0];
          }
          return event;
        },
        // The fetch integration records full outbound URLs as breadcrumbs;
        // some carry secrets in the query string (e.g. ai-qualify.ts puts
        // GEMINI_API_KEY in one). beforeSend does not touch breadcrumbs.
        beforeBreadcrumb(crumb) {
          if (typeof crumb.data?.url === 'string') crumb.data.url = crumb.data.url.split('?')[0];
          return crumb;
        },
      },
      // The SDK types `request` against @cloudflare/workers-types (via the
      // global Request), but the implementation accepts a standard DOM-typed
      // Request — hence the cast.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request: context.request as any,
      // The SDK declares `context` as required, but the implementation
      // tolerates undefined (e.g. during prerendering).
      context: runtime?.ctx as WorkersExecutionContext,
    },
    () => next()
  );
});
