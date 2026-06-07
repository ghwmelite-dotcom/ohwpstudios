// Live GitHub projects feed for the homepage "From our GitHub" strip.
// Fetches public repos, keeps only those with a populated About + README,
// ranks by stars then recency, and returns the top N. Edge-cached to stay
// well within GitHub's rate limits; uses GITHUB_TOKEN if provided.
import type { APIRoute } from 'astro';

export const prerender = false;

const CACHE_TTL = 21600; // 6 hours
const SHOW = 6;          // repos to actually display
const README_MIN_BYTES = 300; // "fully populated" threshold
const CANDIDATES = 12;   // max repos to README-check (curated first, then backfill)

// Hand-picked flagship repos (in priority order) that best demonstrate range and
// capability. Pulled live and still README-gated; extras act as backfill if any
// featured repo ever fails the completeness check.
const FEATURED = [
  'ask-ozzy',
  'cedisense',
  'afrilab',
  'civiclens',
  'skipper-detergents',
  'os-browser',
  // backfill (also flagship-quality)
  'brilla-study-platform',
  'galamsey-monitor',
  'apex10',
  'ohcs-elibrary',
  'ohcs-smartgate-staff-attendance-system',
  'phys-newsfeed',
];

// Repos to never surface in the live strip.
const EXCLUDE = new Set(['claude-skills', 'ea-analysis']);

interface Repo {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  topics?: string[];
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  pushed_at: string;
}

function ghHeaders(token?: string): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ohwpstudios-site',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

// Cloudflare edge-cached fetch
function cachedFetch(url: string, token?: string) {
  return fetch(url, {
    headers: ghHeaders(token),
    // @ts-ignore - cf is a Cloudflare Workers fetch extension
    cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
  });
}

export const GET: APIRoute = async ({ locals }) => {
  const env = (locals as any).runtime?.env ?? {};
  const user = env.GITHUB_USER || 'ghwmelite-dotcom';
  const token = env.GITHUB_TOKEN || undefined;

  const empty = (extra: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ success: true, projects: [], ...extra }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800',
      },
    });

  try {
    const listRes = await cachedFetch(
      `https://api.github.com/users/${user}/repos?per_page=100&sort=pushed`,
      token
    );
    if (!listRes.ok) return empty({ error: `GitHub list ${listRes.status}` });

    const repos = (await listRes.json()) as Repo[];
    if (!Array.isArray(repos)) return empty({ error: 'Unexpected GitHub response' });

    // Base pool: real, original repos with an About description (minus excluded).
    const base = repos.filter(
      (r) =>
        !r.fork &&
        !r.archived &&
        !r.disabled &&
        typeof r.description === 'string' &&
        r.description.trim().length > 0 &&
        !EXCLUDE.has(r.name.toLowerCase())
    );

    const byName = new Map(base.map((r) => [r.name.toLowerCase(), r]));

    // Curated flagship repos first (in FEATURED order), then auto-ranked backfill.
    const featured = FEATURED.map((n) => byName.get(n)).filter(Boolean) as Repo[];
    const featuredNames = new Set(featured.map((r) => r.name.toLowerCase()));
    const backfill = base
      .filter((r) => !featuredNames.has(r.name.toLowerCase()))
      .sort(
        (a, b) =>
          b.stargazers_count - a.stargazers_count ||
          new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
      );

    const candidates = [...featured, ...backfill].slice(0, CANDIDATES);

    // Keep only repos whose README is present and substantial.
    const checked = await Promise.all(
      candidates.map(async (r) => {
        try {
          const res = await cachedFetch(
            `https://api.github.com/repos/${r.full_name}/readme`,
            token
          );
          if (!res.ok) return null;
          const data = (await res.json()) as { size?: number };
          if (!data.size || data.size < README_MIN_BYTES) return null;
          return r;
        } catch {
          return null;
        }
      })
    );

    const projects = checked
      .filter((r): r is Repo => r !== null)
      .slice(0, SHOW)
      .map((r) => ({
        name: r.name,
        title: r.name
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        description: r.description,
        url: r.html_url,
        homepage: r.homepage && r.homepage.trim() ? r.homepage.trim() : null,
        language: r.language,
        stars: r.stargazers_count,
        topics: (r.topics || []).slice(0, 4),
      }));

    return new Response(JSON.stringify({ success: true, projects }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800',
      },
    });
  } catch (e: any) {
    return empty({ error: e?.message || 'fetch failed' });
  }
};
