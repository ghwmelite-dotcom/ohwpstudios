import { defineMiddleware } from 'astro:middleware';
import * as Sentry from '@sentry/cloudflare';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  setAsyncContextStrategy,
  getDefaultCurrentScope,
  getDefaultIsolationScope,
  type Scope,
} from '@sentry/core';
import { SESSION_COOKIE, SESSION_HOURS, timingSafeEqual } from './lib/admin-auth';

type WorkersExecutionContext = import('@cloudflare/workers-types').ExecutionContext;

// Astro's Cloudflare adapter puts the Workers runtime on locals, but does not
// export that shape — type it structurally (same approach as the Sentry cast
// below).
interface CloudflareRuntime {
  ctx?: WorkersExecutionContext;
  env?: { DB?: D1Database };
}

// ---------------------------------------------------------------------------
// Admin session guard
// ---------------------------------------------------------------------------

// Exclusions run FIRST in isGuardedAdminPath — the login endpoint must never
// self-deadlock behind the session it is trying to create.
const PUBLIC_ADMIN_PATHS = [
  '/admin/login',
  '/admin/reset-password',
  '/api/admin/login',
  '/api/admin/reset-password',
];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isGuardedAdminPath(pathname: string): boolean {
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return false;
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
}

interface SessionRow {
  userId: number;
  csrfToken: string | null;
  expiresAt: string;
  username: string;
}

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
 * Two responsibilities, in order:
 *
 * 1. Admin session guard + central CSRF: every /admin/* page and /api/admin/*
 *    endpoint (minus PUBLIC_ADMIN_PATHS) requires a valid, unexpired session
 *    cookie backed by the sessions table; mutating admin API requests must
 *    also carry the per-session X-CSRF-Token header. On success the admin
 *    identity lands on locals.adminUser for downstream handlers.
 *
 * 2. Captures unhandled exceptions from API routes into Sentry.
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
export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  // Astro's Cloudflare adapter exposes the Workers runtime (env + execution
  // context) here. The adapter does not export this shape, so type it
  // structurally.
  const runtime = (context.locals as { runtime?: CloudflareRuntime }).runtime;

  // -------------------------------------------------------------------------
  // Admin session guard — runs BEFORE the Sentry wrapper. Auth rejections are
  // plain responses (401/403/redirect/503), never exceptions, so they have no
  // business inside Sentry's request handler. Requests that pass the guard
  // fall through to the Sentry branch below unchanged.
  // -------------------------------------------------------------------------
  if (isGuardedAdminPath(pathname)) {
    const isApi = pathname.startsWith('/api/');
    const deny = (): Response =>
      isApi
        ? new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        : context.redirect('/admin/login', 302);
    // fail CLOSED — no DB binding (or a DB error) means no way to verify the
    // session; never fail open by calling next().
    const failClosed = (): Response =>
      isApi
        ? new Response(JSON.stringify({ success: false, error: 'Service unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        : context.redirect('/admin/login', 302);

    const db = runtime?.env?.DB;
    if (!db) return failClosed();

    const token = context.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return deny();

    let session: SessionRow | null;
    try {
      session = await db
        .prepare(
          "SELECT s.user_id AS userId, s.csrf_token AS csrfToken, s.expires_at AS expiresAt, u.username FROM sessions s JOIN admin_users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > datetime('now')"
        )
        .bind(token)
        .first<SessionRow>();
    } catch {
      return failClosed();
    }
    if (!session) return deny();

    // Central CSRF check for mutating admin API requests — rejects before any
    // endpoint code runs. The token travels in a header, which a cross-site
    // form post cannot set.
    if (isApi && MUTATING.has(context.request.method)) {
      const header = context.request.headers.get('X-CSRF-Token') ?? '';
      if (!session.csrfToken || !timingSafeEqual(header, String(session.csrfToken))) {
        return new Response(
          JSON.stringify({ success: false, error: 'CSRF token missing or invalid' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    context.locals.adminUser = {
      id: Number(session.userId),
      username: String(session.username),
      csrfToken: String(session.csrfToken),
    };

    // Sliding renewal when less than half the window remains. Best-effort and
    // off the critical path: failures are swallowed and the response is not
    // blocked (waitUntil keeps the isolate alive until the UPDATE settles).
    const msLeft =
      new Date(String(session.expiresAt).replace(' ', 'T') + 'Z').getTime() - Date.now();
    if (Number.isFinite(msLeft) && msLeft < (SESSION_HOURS / 2) * 3600 * 1000) {
      const renew = db
        .prepare("UPDATE sessions SET expires_at = datetime('now', ?) WHERE token = ?")
        .bind(`+${SESSION_HOURS} hours`, token)
        .run()
        .catch(() => {});
      runtime?.ctx?.waitUntil?.(renew);
    }
  }

  if (!SENTRY_DSN || !pathname.startsWith('/api/')) {
    return next();
  }

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
