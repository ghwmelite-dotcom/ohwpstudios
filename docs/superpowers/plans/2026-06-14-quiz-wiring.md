# Quiz Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Project Discovery Quiz a working lead channel — fix the dead submit endpoint, persist leads, email both parties, surface leads in admin, and bring quiz content to the site's GHS-primary + no-emoji standards.

**Architecture:** A new pure `quiz-recommendation.ts` module is the single source of truth for the recommendation, imported by both the quiz page (client) and the new `submit.ts` endpoint (email). `submit.astro` (a dead `.astro` "endpoint") is replaced by a real `submit.ts` API route that rate-limits, persists to the existing `quiz_leads` table (critical path), then sends admin + visitor emails (best-effort). A new `/admin/quiz-leads` page + `/api/admin/quiz-leads.ts` (auto-guarded by middleware) let the studio action leads. Emoji icons become a small shared `QuizIcon.astro` set; budget bands become GHS-primary.

**Tech Stack:** Astro 4 hybrid + Cloudflare (D1, Pages advanced-mode `_worker.js`), `src/lib/email.ts` (Resend), `src/utils/rate-limit.ts`, existing `quiz_leads` table (migration 006).

**Spec:** `docs/superpowers/specs/2026-06-14-quiz-wiring-design.md`

**Verified current state:**
- `src/pages/api/quiz/submit.astro` is a `.astro` file → Astro renders it as a *page*; its `export const POST` never runs. The quiz's `fetch('/api/quiz/submit', {method:'POST'})` always fails → "Something went wrong" alert. **This is the core bug.**
- `quiz_leads` table EXISTS in remote prod D1 (migration `006_quiz_leads_and_case_studies.sql`). Columns: `id, name, email, company, goal, platform, audience, timeline, features, budget, involvement, created_at, contacted (BOOLEAN default 0), contacted_at, notes`. No new migration needed.
- `src/lib/email.ts` exports: `sendEmail(env, {to, subject, html, replyTo?})` (throws on failure; no-ops silently when `RESEND_API_KEY` absent — so it is safe in local dev / CF preview), `emailShell(title, bodyHtml)`, `emailButton(href, label)`, `escapeHtml(s)`, `ADMIN_EMAIL = 'ohwpstudios@gmail.com'`. Reference caller: `src/pages/api/booking.ts`.
- `src/utils/rate-limit.ts` exports `checkRateLimit(id, config) → {allowed, retryAfter?, remaining?}`, `getClientIdentifier(request)`, `RATE_LIMITS` (LOGIN/API/PAYMENT/CHAT). Config shape: `{ maxAttempts, windowMs, blockDurationMs }`.
- `src/middleware.ts` auto-guards every `/admin/*` page (redirect to login if no session) and every `/api/admin/*` endpoint (401 if no session); mutating `/api/admin/*` requests must carry header `X-CSRF-Token` matching the session. Admin client pages fetch the token via `GET /api/admin/session` → `{ csrf_token }`, then send it as `X-CSRF-Token`. Reference: `src/pages/admin/contacts.astro` (lines 612-619 init; 800 send) + `src/pages/api/admin/contacts.ts`.
- Quiz client already calls `window.ohwpTrack?.('quiz_completed')` on success and redirects to `/quiz/thank-you`. Keep both.
- Client-side HTML escaping helper exists at `@/utils/escape-html` (`escapeHtml`).
- DEPLOY: GitHub Actions billing-locked → MANUAL `wrangler pages deploy dist --project-name=ohwpstudios --branch=main` after building with prod `PUBLIC_*` env vars. CF Pages PREVIEW lacks `RESEND_API_KEY` (production-only) → email can only be verified on production.

**Testing note:** no test framework in this repo. Per task: `npm run build` (exit 0) + dev-server / curl checks. Final task: manual deploy + prod smoke + a real test submission that persists, emails `ohwpstudios@gmail.com`, and reads back in `/admin/quiz-leads`, then row cleanup.

**File structure:**
- Create `src/lib/quiz-recommendation.ts` — pure rule-based recommendation (shared client + server).
- Create `src/components/QuizIcon.astro` — inline-SVG icon set (replaces emoji); keyed by id.
- Create `src/pages/api/quiz/submit.ts` — real endpoint; **delete** `src/pages/api/quiz/submit.astro`.
- Modify `src/utils/rate-limit.ts` — add `RATE_LIMITS.QUIZ`.
- Modify `src/pages/quiz.astro` — use shared rec module, GHS budget bands, QuizIcon icons.
- Create `src/pages/api/admin/quiz-leads.ts` — list + mark-contacted.
- Create `src/pages/admin/quiz-leads.astro` — admin table view + CSV.
- Modify `src/pages/admin/dashboard.astro` — add a Quiz Leads card.

---

### Task 1: Shared recommendation module

**Files:**
- Create: `src/lib/quiz-recommendation.ts`

- [ ] **Step 1: Write the module**

```ts
// src/lib/quiz-recommendation.ts
// Single source of truth for the quiz's recommendation — used by both the
// quiz page (client) and the submit endpoint (email). Pure, no deps.

export interface QuizAnswers {
  goal?: string;
  platform?: string;
  audience?: string;
  timeline?: string;
  features?: string;
  budget?: string;
  involvement?: string;
}

export interface Recommendation {
  key: string;        // stable id
  title: string;
  description: string;
  serviceUrl: string; // existing on-site page
  iconId: string;     // key into QuizIcon.astro's set
}

const CUSTOM: Recommendation = {
  key: 'custom-software',
  title: 'Custom Software Development',
  description:
    'A custom-built solution shaped around your exact goals — designed, built, and shipped by our team.',
  serviceUrl: '/services/custom-web-application-development',
  iconId: 'cpu',
};

/**
 * Maps the seven quiz answers to one recommended solution. Order matters:
 * the most specific signal (platform) wins, then goal, then a sensible default.
 */
export function recommendSolution(a: QuizAnswers): Recommendation {
  if (a.platform === 'mobile') {
    return {
      key: 'mobile-app',
      title: 'Mobile App Development',
      description:
        'A polished native or cross-platform mobile app your users will love — built for iOS and Android.',
      serviceUrl: '/estimate-project',
      iconId: 'smartphone',
    };
  }
  if (a.platform === 'both') {
    return {
      key: 'fullstack-web-mobile',
      title: 'Full-Stack Web & Mobile Solution',
      description:
        'A complete platform — web app plus mobile apps — for maximum reach across every device.',
      serviceUrl: '/technologies/fullstack-development',
      iconId: 'monitor',
    };
  }
  if (a.platform === 'enterprise') {
    return {
      key: 'enterprise-software',
      title: 'Enterprise Software Development',
      description:
        'A robust, scalable enterprise system designed to grow with your business and your team.',
      serviceUrl: '/services/saas-application-development',
      iconId: 'layers',
    };
  }
  if (a.goal === 'startup') {
    return {
      key: 'mvp-development',
      title: 'MVP Development',
      description:
        'Launch fast with a focused Minimum Viable Product to validate your idea and win early users.',
      serviceUrl: '/solutions/startup-mvp-development',
      iconId: 'zap',
    };
  }
  if (a.goal === 'transform') {
    return {
      key: 'digital-transformation',
      title: 'Digital Transformation',
      description:
        'Modernise legacy systems with current technology and streamlined, automation-ready processes.',
      serviceUrl: '/services/custom-web-application-development',
      iconId: 'refresh',
    };
  }
  return CUSTOM;
}
```

- [ ] **Step 2: Typecheck via build**

Run: `npm run build`
Expected: exit 0 (module compiles; nothing imports it yet).

- [ ] **Step 3: Commit**

```powershell
git add src/lib/quiz-recommendation.ts
git commit -m "feat(quiz): shared rule-based recommendation module"
```

---

### Task 2: Real submit endpoint + rate-limit

**Files:**
- Modify: `src/utils/rate-limit.ts` (add `QUIZ` config)
- Create: `src/pages/api/quiz/submit.ts`
- Delete: `src/pages/api/quiz/submit.astro`

- [ ] **Step 1: Add the QUIZ rate config**

In `src/utils/rate-limit.ts`, add to the `RATE_LIMITS` object (alongside `CHAT`):

```ts
  QUIZ: {
    maxAttempts: 5,                 // 5 submissions
    windowMs: 60 * 1000,            // per minute
    blockDurationMs: 5 * 60 * 1000, // soft-block 5 minutes
  },
```

- [ ] **Step 2: Delete the dead `.astro` endpoint and create the real one**

Delete `src/pages/api/quiz/submit.astro`. Create `src/pages/api/quiz/submit.ts`:

```ts
import type { APIRoute } from 'astro';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '../../../utils/rate-limit';
import { sendEmail, emailShell, emailButton, escapeHtml, ADMIN_EMAIL } from '../../../lib/email';
import { recommendSolution, type QuizAnswers } from '../../../lib/quiz-recommendation';

export const prerender = false;

const ANSWER_LABELS: Record<string, string> = {
  goal: 'Primary goal',
  platform: 'Solution type',
  audience: 'Target audience',
  timeline: 'Timeline',
  features: 'Top priority feature',
  budget: 'Budget range',
  involvement: 'Involvement style',
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Rate limit (in-memory per isolate; friendly 429 on burst)
    const rl = await checkRateLimit('quiz-submit:' + getClientIdentifier(request), RATE_LIMITS.QUIZ);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many submissions, please try again shortly.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();
    const name = (data.name || '').toString().slice(0, 120).trim();
    const email = (data.email || '').toString().slice(0, 200).trim();
    const company = data.company ? data.company.toString().slice(0, 200).trim() : null;
    const answers: QuizAnswers = data.answers && typeof data.answers === 'object' ? data.answers : {};

    if (!name || !email || !data.answers) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL PATH: persist the lead. A failure here returns 500 so the widget
    // retries — we never silently drop a lead.
    await db
      .prepare(
        `INSERT INTO quiz_leads
          (name, email, company, goal, platform, audience, timeline, features, budget, involvement, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        name,
        email,
        company,
        answers.goal || null,
        answers.platform || null,
        answers.audience || null,
        answers.timeline || null,
        answers.features || null,
        answers.budget || null,
        answers.involvement || null
      )
      .run();

    const recommendation = recommendSolution(answers);

    // BEST-EFFORT: emails must never fail the submit after the lead is saved.
    try {
      const env = locals.runtime?.env || {};

      const answerRows = Object.entries(ANSWER_LABELS)
        .map(([k, label]) => {
          const v = (answers as Record<string, string | undefined>)[k];
          return v ? `<tr><td style="padding:4px 12px 4px 0;color:#8a7a63;">${escapeHtml(label)}</td><td style="padding:4px 0;"><strong>${escapeHtml(v)}</strong></td></tr>` : '';
        })
        .join('');

      // Admin alert
      await sendEmail(env, {
        to: ADMIN_EMAIL,
        subject: `New quiz lead: ${name}`,
        replyTo: email,
        html: emailShell(
          'New Quiz Lead',
          `<p style="margin:0 0 12px;">A new Project Discovery Quiz was completed.</p>
           <p style="margin:0 0 16px;"><strong>${escapeHtml(name)}</strong>${company ? ' · ' + escapeHtml(company) : ''}<br>
           <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
           <p style="margin:0 0 6px;color:#8a7a63;">Recommended: <strong>${escapeHtml(recommendation.title)}</strong></p>
           <table style="border-collapse:collapse;font-size:14px;margin-top:8px;">${answerRows}</table>`
        ),
      });

      // Visitor thank-you with the personalized recommendation
      await sendEmail(env, {
        to: email,
        subject: 'Your OhWP Studios recommendation',
        replyTo: ADMIN_EMAIL,
        html: emailShell(
          'Your Personalized Recommendation',
          `<p style="margin:0 0 12px;">Hi ${escapeHtml(name)}, thanks for completing our Project Discovery Quiz!</p>
           <p style="margin:0 0 6px;color:#8a7a63;">Based on your answers, we recommend:</p>
           <h2 style="margin:0 0 8px;font-size:20px;">${escapeHtml(recommendation.title)}</h2>
           <p style="margin:0 0 20px;">${escapeHtml(recommendation.description)}</p>
           ${emailButton('https://ohwpstudios.org/booking', 'Book a free consultation')}
           <p style="margin:20px 0 0;font-size:13px;color:#8a7a63;">Prefer email? Just reply to this message — we read every one.</p>`
        ),
      });
    } catch (e) {
      console.error('quiz email failed (non-fatal):', e);
    }

    return new Response(JSON.stringify({ success: true, recommendation }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 3: Verify build + endpoint shape**

Run: `npm run build`
Expected: exit 0. The build log lists `λ src/pages/api/quiz/submit.ts` as an on-demand route (NOT a prerendered page), and `submit.astro` is gone.

Dev check (`npm run dev`): `POST /api/quiz/submit` with `{"name":"T","email":"t@example.com","answers":{"platform":"mobile"}}` → 200 `{success:true, recommendation:{key:"mobile-app",...}}`; a local `quiz_leads` row appears; missing-field body → 400; a 6th rapid POST → 429. (Email no-ops locally — no `RESEND_API_KEY`.)

- [ ] **Step 4: Commit**

```powershell
git add src/utils/rate-limit.ts src/pages/api/quiz/submit.ts
git rm src/pages/api/quiz/submit.astro
git commit -m "fix(quiz): real submit.ts endpoint — rate-limit, persist (critical), notify (best-effort)"
```

---

### Task 3: Quiz page — shared rec, GHS budget bands, SVG icons

**Files:**
- Create: `src/components/QuizIcon.astro`
- Modify: `src/pages/quiz.astro`

- [ ] **Step 1: Create the icon set component**

```astro
---
// src/components/QuizIcon.astro — inline line-SVG icon set (replaces emoji).
// Usage: <QuizIcon id="rocket" /> . stroke style matches the site's .question-icon.
interface Props { id: string; size?: number; class?: string; }
const { id, size = 32, class: cls = '' } = Astro.props;

const ICONS: Record<string, string> = {
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
  'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>',
  refresh: '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line>',
  globe: '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>',
  smartphone: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
  clock: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
  target: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>',
  'credit-card': '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>',
  'bar-chart': '<line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>',
  code: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
  award: '<circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>',
};
const inner = ICONS[id] || ICONS.cpu;
---
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls} set:html={inner}></svg>
```

- [ ] **Step 2: Swap the 28 option emoji + the recommendation icon in `src/pages/quiz.astro`**

Add the import to the frontmatter (top `---` block), alongside the existing imports:

```astro
import QuizIcon from '@/components/QuizIcon.astro';
```

Replace every `<div class="option-icon">EMOJI</div>` with `<div class="option-icon"><QuizIcon id="ID" /></div>` using this exact mapping (in document order):

- Q1 goal: startup→`zap`, grow→`trending-up`, transform→`refresh`, automate→`cpu`
- Q2 platform: web→`globe`, mobile→`smartphone`, both→`monitor`, enterprise→`layers`
- Q3 audience: consumers→`users`, businesses→`briefcase`, internal→`user`, both-audiences→`globe`
- Q4 timeline: urgent→`zap`, fast→`trending-up`, normal→`calendar`, long→`target`
- Q5 features: users→`user`, payments→`credit-card`, data→`bar-chart`, integration→`link`
- Q6 budget: starter→`credit-card`, growth→`trending-up`, scale→`layers`, enterprise→`award`
- Q7 involvement: hands-off→`target`, collaborative→`users`, involved→`code`, partnership→`award`

For the results card, replace `<div class="recommendation-icon" id="recommendationIcon">🚀</div>` with `<div class="recommendation-icon" id="recommendationIcon"></div>` (the script fills it — see Step 4). The `.option-icon` CSS currently sets `font-size: 3rem` for emoji; add an SVG color rule near it in the `<style>` block:

```css
  .option-icon { color: var(--color-primary); }
  .option-icon svg { width: 40px; height: 40px; }
  .recommendation-icon { color: var(--color-primary); display:flex; justify-content:center; }
  .recommendation-icon svg { width: 56px; height: 56px; }
```

- [ ] **Step 3: GHS-primary budget bands (Question 6)**

In Question 6's four option cards, replace ONLY the visible `<h3>` and `<p>` text (leave `data-value` and `data-next` unchanged):

```html
<button class="option-card" data-value="starter" data-next="7">
  <div class="option-icon"><QuizIcon id="credit-card" /></div>
  <h3>GH₵120,000 – GH₵300,000</h3>
  <p>$10k – $25k · MVP or simple app</p>
</button>
<button class="option-card" data-value="growth" data-next="7">
  <div class="option-icon"><QuizIcon id="trending-up" /></div>
  <h3>GH₵300,000 – GH₵600,000</h3>
  <p>$25k – $50k · full-featured product</p>
</button>
<button class="option-card" data-value="scale" data-next="7">
  <div class="option-icon"><QuizIcon id="layers" /></div>
  <h3>GH₵600,000 – GH₵1,200,000</h3>
  <p>$50k – $100k · enterprise-grade</p>
</button>
<button class="option-card" data-value="enterprise" data-next="7">
  <div class="option-icon"><QuizIcon id="award" /></div>
  <h3>GH₵1,200,000+</h3>
  <p>$100k+ · large-scale platform</p>
</button>
```

- [ ] **Step 4: Source the recommendation from the shared module in the client script**

In the `<script>` block of `src/pages/quiz.astro`, add the import at the top:

```ts
import { recommendSolution } from '@/lib/quiz-recommendation';
```

Replace the entire `generateRecommendation()` function (the one with the hardcoded `if (answers.platform === 'mobile')` chain) with:

```ts
  const REC_ICONS: Record<string, string> = {
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
    smartphone: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>',
    refresh: '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line>',
  };

  function generateRecommendation() {
    const iconEl = document.getElementById('recommendationIcon');
    const titleEl = document.getElementById('recommendationTitle');
    const descEl = document.getElementById('recommendationDescription');
    const rec = recommendSolution(answers);
    if (iconEl) iconEl.innerHTML = `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${REC_ICONS[rec.iconId] || REC_ICONS.cpu}</svg>`;
    if (titleEl) titleEl.textContent = rec.title;
    if (descEl) descEl.textContent = rec.description;
  }
```

(The `answers` object's keys already match `QuizAnswers` — set by the existing option-click handler via `questionTypes = ['goal','platform','audience','timeline','features','budget','involvement']`. No change to that handler.)

- [ ] **Step 5: Verify build + dev**

Run: `npm run build`
Expected: exit 0.

Dev (`npm run dev`, open `/quiz`): no emoji anywhere — option cards show line-SVG icons; Question 6 shows GH₵ amounts with the `$` sub-line; completing the quiz shows a recommendation (title + description + SVG icon) on the results slide that matches the answers (pick "Mobile App" at Q2 → "Mobile App Development").

- [ ] **Step 6: Commit**

```powershell
git add src/components/QuizIcon.astro src/pages/quiz.astro
git commit -m "feat(quiz): SVG icons (no emoji), GHS-primary budget bands, shared recommendation"
```

---

### Task 4: Admin quiz-leads view

**Files:**
- Create: `src/pages/api/admin/quiz-leads.ts`
- Create: `src/pages/admin/quiz-leads.astro`
- Modify: `src/pages/admin/dashboard.astro` (add a card)

- [ ] **Step 1: Data API (auto-guarded by middleware)**

```ts
// src/pages/api/admin/quiz-leads.ts
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }
    const rows = await db
      .prepare('SELECT * FROM quiz_leads ORDER BY created_at DESC LIMIT 500')
      .all();
    return new Response(JSON.stringify({ success: true, leads: rows.results || [] }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching quiz leads:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch quiz leads' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Mark contacted. Middleware enforces the X-CSRF-Token header for mutating
// /api/admin/* requests, so no extra CSRF check is needed here.
export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }
    const { id, contacted } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Lead ID required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    const flag = contacted ? 1 : 0;
    await db
      .prepare(
        "UPDATE quiz_leads SET contacted = ?, contacted_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = ?"
      )
      .bind(flag, flag, id)
      .run();
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating quiz lead:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to update quiz lead' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 2: Admin page**

```astro
---
// src/pages/admin/quiz-leads.astro
import BaseLayout from '@/layouts/BaseLayout.astro';
export const prerender = false;
const title = 'Quiz Leads';
---
<BaseLayout title={title} noLoader={true}>
  <div class="admin-container">
    <div class="admin-header">
      <div class="header-left">
        <a href="/admin/dashboard" class="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Dashboard
        </a>
        <h1>Quiz Leads</h1>
      </div>
      <button id="export-csv" class="btn-export">Export CSV</button>
    </div>

    <div id="loading-state" class="state">Loading…</div>
    <div id="empty-state" class="state" style="display:none;">No quiz leads yet.</div>
    <div class="table-wrap" id="table-wrap" style="display:none;">
      <table class="leads-table">
        <thead>
          <tr>
            <th>Date</th><th>Name</th><th>Email</th><th>Company</th>
            <th>Goal</th><th>Platform</th><th>Budget</th><th>Timeline</th><th>Contacted</th>
          </tr>
        </thead>
        <tbody id="leads-body"></tbody>
      </table>
    </div>
  </div>

  <style>
    .admin-container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
    .admin-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap; }
    .header-left { display:flex; align-items:center; gap:1rem; flex-wrap:wrap; }
    .back-link { display:inline-flex; align-items:center; gap:.4rem; color:var(--color-text-muted); text-decoration:none; }
    .back-link:hover { color:var(--color-primary); }
    h1 { margin:0; font-size:1.6rem; }
    .btn-export { min-height:44px; padding:.6rem 1.1rem; border-radius:var(--radius-lg); background:var(--gradient-primary); color:#fff; font-weight:700; border:none; cursor:pointer; }
    .state { padding:2rem; text-align:center; color:var(--color-text-muted); }
    .table-wrap { overflow-x:auto; border:1px solid var(--color-border); border-radius:var(--radius-xl); }
    .leads-table { width:100%; border-collapse:collapse; font-size:.9rem; }
    .leads-table th, .leads-table td { padding:.7rem .85rem; text-align:left; border-bottom:1px solid var(--color-border); white-space:nowrap; }
    .leads-table th { background:var(--color-bg-alt); font-weight:700; }
    .mark-btn { min-height:36px; padding:.35rem .7rem; border-radius:var(--radius-md); border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text); cursor:pointer; font-weight:600; }
    .mark-btn.is-done { background:rgba(16,185,129,.12); color:#10b981; border-color:rgba(16,185,129,.3); }
  </style>

  <script>
    import { escapeHtml } from '@/utils/escape-html';

    let CSRF = '';
    let leads: any[] = [];

    async function initAdminSession() {
      const res = await fetch('/api/admin/session');
      if (!res.ok) { window.location.href = '/admin/login'; return false; }
      const data = await res.json();
      CSRF = data.csrf_token;
      return true;
    }

    function fmtDate(s: string) {
      if (!s) return '';
      const d = new Date(s.replace(' ', 'T') + 'Z');
      return isNaN(d.getTime()) ? s : d.toLocaleDateString();
    }

    function render() {
      const body = document.getElementById('leads-body');
      const loading = document.getElementById('loading-state');
      const empty = document.getElementById('empty-state');
      const wrap = document.getElementById('table-wrap');
      if (loading) loading.style.display = 'none';
      if (!leads.length) { if (empty) empty.style.display = 'block'; return; }
      if (wrap) wrap.style.display = 'block';
      if (!body) return;
      body.innerHTML = leads.map((l) => `
        <tr>
          <td>${escapeHtml(fmtDate(l.created_at))}</td>
          <td>${escapeHtml(l.name || '')}</td>
          <td><a href="mailto:${escapeHtml(l.email || '')}">${escapeHtml(l.email || '')}</a></td>
          <td>${escapeHtml(l.company || '')}</td>
          <td>${escapeHtml(l.goal || '')}</td>
          <td>${escapeHtml(l.platform || '')}</td>
          <td>${escapeHtml(l.budget || '')}</td>
          <td>${escapeHtml(l.timeline || '')}</td>
          <td><button class="mark-btn ${l.contacted ? 'is-done' : ''}" data-id="${l.id}" data-contacted="${l.contacted ? 1 : 0}">${l.contacted ? '✓ Contacted' : 'Mark contacted'}</button></td>
        </tr>`).join('');

      body.querySelectorAll('.mark-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const el = e.currentTarget as HTMLElement;
          const id = Number(el.dataset.id);
          const next = el.dataset.contacted === '1' ? 0 : 1;
          const res = await fetch('/api/admin/quiz-leads', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
            body: JSON.stringify({ id, contacted: next === 1 }),
          });
          if (res.ok) {
            const lead = leads.find((x) => x.id === id);
            if (lead) lead.contacted = next;
            render();
          } else {
            alert('Could not update. Please reload and try again.');
          }
        });
      });
    }

    function exportCsv() {
      const cols = ['created_at','name','email','company','goal','platform','audience','timeline','features','budget','involvement','contacted'];
      const head = cols.join(',');
      const rows = leads.map((l) => cols.map((c) => `"${String(l[c] ?? '').replace(/"/g, '""')}"`).join(','));
      const blob = new Blob([[head, ...rows].join('\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'quiz-leads.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    }

    async function load() {
      if (!(await initAdminSession())) return;
      const res = await fetch('/api/admin/quiz-leads');
      if (!res.ok) { window.location.href = '/admin/login'; return; }
      const data = await res.json();
      leads = data.leads || [];
      render();
      document.getElementById('export-csv')?.addEventListener('click', exportCsv);
    }

    load();
  </script>
</BaseLayout>
```

- [ ] **Step 3: Add a dashboard card**

In `src/pages/admin/dashboard.astro`, find the grid of admin link cards (e.g. the card linking to `/admin/contacts` or `/admin/bookings`) and add an analogous card immediately after one of them:

```html
<a href="/admin/quiz-leads" class="dashboard-card">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M9 11l3 3L22 4"></path>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
  </svg>
  <h3>Quiz Leads</h3>
  <p>Discovery quiz submissions</p>
</a>
```

(Match the EXACT class names and inner markup of the sibling cards already in `dashboard.astro` — read the file and copy a neighbor's structure; the markup above is the shape, but use the real card class so styling is consistent.)

- [ ] **Step 4: Verify build + dev**

Run: `npm run build`
Expected: exit 0; build log lists `λ src/pages/admin/quiz-leads.astro` and `λ src/pages/api/admin/quiz-leads.ts`.

Dev: visit `/admin/quiz-leads` while logged out → redirected to `/admin/login`. `curl /api/admin/quiz-leads` with no session → 401 (middleware). Logged in: the table lists the lead created in Task 2; "Mark contacted" toggles and persists (reload shows it stuck); Export CSV downloads. Dashboard shows the new Quiz Leads card.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/api/admin/quiz-leads.ts src/pages/admin/quiz-leads.astro src/pages/admin/dashboard.astro
git commit -m "feat(admin): quiz-leads list view, mark-contacted, CSV, dashboard card"
```

---

### Task 5: Verification + manual deploy + gate (MANUAL)

**Files:** none (process)

- [ ] **Step 1: Local battery**

`npm run build` → exit 0. Dev end-to-end: complete the quiz → submit → 200 with recommendation → redirect to `/quiz/thank-you`; the lead appears in `/admin/quiz-leads`; no emoji in the quiz; budget bands GH₵-primary; over-limit burst → 429; mark-contacted persists.

- [ ] **Step 2: Confirm `quiz_leads` is in remote prod** (already verified during design; re-confirm)

```powershell
$env:CLOUDFLARE_ACCOUNT_ID="ea2eb3a9813660dfca2a60e594858538"
npx wrangler d1 execute agency-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='quiz_leads';"
```

Expected: one row `quiz_leads`. (No migration to apply.)

- [ ] **Step 3: Manual production deploy** (GitHub Actions billing-locked — replicate CI)

```powershell
$env:PUBLIC_GA_ID="G-RDJ4N7W8GH"; $env:PUBLIC_CF_BEACON_TOKEN="9f29263b2d8441e18851a67bf9e09039"
$env:PUBLIC_SENTRY_DSN="https://8cf93b70faa7954afe0c228987a2382a@o4511547761360896.ingest.de.sentry.io/4511547781677136"
$env:PUBLIC_COMMIT_SHA=(git rev-parse HEAD)
npm run build
$env:CLOUDFLARE_ACCOUNT_ID="ea2eb3a9813660dfca2a60e594858538"
# preview first
npx wrangler pages deploy dist --project-name=ohwpstudios --branch=qw-preview --commit-dirty=true
```

On the preview: complete a quiz with an obvious test name (e.g. `__QW_TEST__`) and the email `ohwpstudios@gmail.com` → it persists to the SHARED prod D1. (Email won't send on preview — CF preview lacks `RESEND_API_KEY`; that's expected. Email is verified on production in Step 4.) Confirm 429 on a burst.

- [ ] **Step 4: USER GATE → production**

Present preview results. On approval:

```powershell
npx wrangler pages deploy dist --project-name=ohwpstudios --branch=main --commit-dirty=true
node scripts/smoke-test.mjs https://ohwpstudios.org   # all green (no regressions)
```

Then a LIVE check: complete the quiz on `https://ohwpstudios.org` with test name `__QW_PRODLIVE__` and email `ohwpstudios@gmail.com`; confirm (a) it persists and shows in `/admin/quiz-leads`, (b) BOTH emails arrive at `ohwpstudios@gmail.com` (admin alert + visitor recommendation). Then delete the test rows:

```powershell
$env:CLOUDFLARE_ACCOUNT_ID="ea2eb3a9813660dfca2a60e594858538"
npx wrangler d1 execute agency-db --remote --command "DELETE FROM quiz_leads WHERE name IN ('__QW_TEST__','__QW_PRODLIVE__');"
```

Update memory with what shipped.

## Done means

- A completed quiz persists one `quiz_leads` row and the visitor is never shown the error alert (submit works).
- Admin gets a lead-alert email; the visitor gets their personalized recommendation + a consultation CTA (fulfilling the thank-you-page promise).
- `/admin/quiz-leads` lists leads, mark-contacted works, CSV exports; the dashboard links to it.
- The quiz shows GHS-primary budget bands and SVG icons (zero emoji), and the on-page recommendation matches the email (one shared module).
- Public submit endpoint is rate-limited; persistence is non-silent (500→retry); emails are best-effort.
- Deployed manually (Actions billing-locked); prod smoke green; a live submission persists, emails, and reads back in admin.
```
