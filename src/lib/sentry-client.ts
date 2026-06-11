import * as Sentry from '@sentry/browser';

/**
 * DSN is baked in at build time (import.meta.env is statically inlined and the
 * whole SDK tree-shakes away when unset) — changing the DSN requires a rebuild.
 */
export function initSentry(): void {
  const dsn = import.meta.env.PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  try {
    Sentry.init({
      dsn,
      release: import.meta.env.PUBLIC_COMMIT_SHA || 'dev',
      sampleRate: 1.0, // capture all errors; volume is low
      tracesSampleRate: 0, // no performance tracing this phase (free-tier budget)
      // Strip query strings: pages like /newsletter/verify?token=… would
      // otherwise ship live tokens to Sentry via event URLs and breadcrumbs.
      beforeSend(event) {
        if (event.request?.url) event.request.url = event.request.url.split('?')[0];
        return event;
      },
      beforeBreadcrumb(crumb) {
        if (typeof crumb.data?.url === 'string') crumb.data.url = crumb.data.url.split('?')[0];
        return crumb;
      },
    });
  } catch {
    // observability must never break the page
  }
}
