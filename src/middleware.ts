import { defineMiddleware } from 'astro:middleware';
import * as Sentry from '@sentry/cloudflare';

/**
 * Captures unhandled exceptions from API routes into Sentry.
 * - Only wraps /api/* (page rendering stays untouched).
 * - No-ops entirely when PUBLIC_SENTRY_DSN is unset (local dev) — the DSN is
 *   statically inlined at build time, so changing it requires a rebuild.
 * - PII: request bodies, cookies, headers, and query strings are stripped in
 *   beforeSend; contact/estimate/careers submissions must never reach Sentry.
 *
 * Verified against the installed @sentry/cloudflare@8.55.x:
 * wrapRequestHandler({ options, request, context }, handler) re-throws after
 * captureException, so error response behavior is unchanged, and it tolerates
 * an undefined execution context (e.g. during prerendering).
 */
export const onRequest = defineMiddleware((context, next) => {
  const dsn = import.meta.env.PUBLIC_SENTRY_DSN;
  if (!dsn || !context.url.pathname.startsWith('/api/')) {
    return next();
  }

  // Astro's Cloudflare adapter exposes the Workers execution context here.
  // Typed loosely because the adapter does not export this shape.
  const runtime = (context.locals as { runtime?: { ctx?: unknown } }).runtime;

  return Sentry.wrapRequestHandler(
    {
      options: {
        dsn,
        release: import.meta.env.PUBLIC_COMMIT_SHA || 'dev',
        sendDefaultPii: false,
        sampleRate: 1.0, // capture all errors; volume is low
        tracesSampleRate: 0, // no performance tracing this phase
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
      },
      // The SDK types `request` against @cloudflare/workers-types and
      // `context` as required, but the implementation accepts a standard
      // Request and an undefined context — hence the casts.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request: context.request as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: runtime?.ctx as any,
    },
    () => next()
  );
});
