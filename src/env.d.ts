/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
// Ambient declaration file — do NOT add top-level import/export statements; they would convert this to a module and silently un-merge the global Window/ImportMetaEnv augmentations.

// Cloudflare Pages types
type D1Database = import('@cloudflare/workers-types').D1Database;

type PagesFunction<Env = unknown> = import('@cloudflare/workers-types').PagesFunction<Env>;

// Environment bindings
interface Env {
  DB?: D1Database;
  AI?: any;
}

// Astro middleware/route locals. Merges with astro/client's App.Locals.
declare namespace App {
  interface Locals {
    /** Set by the admin session guard in src/middleware.ts for authenticated /admin + /api/admin requests. */
    adminUser?: {
      id: number;
      username: string;
      csrfToken: string;
    };
  }
}

interface Window {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  ohwpTrack?: typeof import('./lib/analytics').track;
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
