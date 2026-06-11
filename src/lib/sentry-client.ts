import * as Sentry from '@sentry/browser';

export function initSentry(): void {
  const dsn = import.meta.env.PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    release: import.meta.env.PUBLIC_COMMIT_SHA || 'dev',
    sampleRate: 1.0, // capture all errors; volume is low
    tracesSampleRate: 0, // no performance tracing this phase (free-tier budget)
  });
}
