/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// Cloudflare Pages types
type D1Database = import('@cloudflare/workers-types').D1Database;

type PagesFunction<Env = unknown> = import('@cloudflare/workers-types').PagesFunction<Env>;

// Environment bindings
interface Env {
  DB?: D1Database;
  AI?: any;
}

interface Window {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  ohwpTrack?: (
    event: string,
    params?: Record<string, string | number | boolean>
  ) => void;
}

interface ImportMetaEnv {
  readonly PUBLIC_GA_ID?: string;
  readonly PUBLIC_CF_BEACON_TOKEN?: string;
  readonly PUBLIC_SENTRY_DSN?: string;
  readonly PUBLIC_COMMIT_SHA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
