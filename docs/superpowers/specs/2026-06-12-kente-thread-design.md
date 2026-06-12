# Kente Thread — Ghanaian Design Identity — Design Spec

**Date:** 2026-06-12
**Status:** Approved by user (design conversation; direction A chosen from three visual options; dark-default confirmed)
**Scope:** Site-wide visual identity overhaul: palette/typography token revolution, kente + Adinkra motif system, per-component application pass, email re-skin, OG image. NO copy/language changes (user chose visual-only), no photography (design without; slots ready), no logo redesign, no admin-page motifs, no structural/conversion changes (Phase 2 ladder preserved).

## Context & intent

The user judged the current indigo/pink glassmorphism aesthetic "too foreign" — it's the default template look of US SaaS. Goal: the site should "depict the best of Ghana and be uniquely outstandingly beautiful with an immersive and inclusive feel," while keeping the premium credibility and conversion structure shipped in Phase 2. Chosen direction: **Kente Thread** — premium Ghanaian modernism. Identity carried entirely by palette, motifs, and typography (no Twi copy, no cultural tooltips — may be layered later).

**Inclusion is defined as:** AA contrast everywhere, both themes; instant comprehension for international visitors (plain English everywhere); performance on Ghanaian mobile data (all motifs CSS/SVG, exactly one webfont file, no LCP regression).

## 1. Token revolution (`src/styles/design-system.css`)

**Hard constraint: token NAMES are immutable; only VALUES change.** The admin theme-customizer (D1-backed, applied via `/api/page-init`) and every component reference `--color-primary`, `--gradient-primary`, etc. Verify after the swap that admin theme overrides still apply cleanly.

### Dark theme — becomes DEFAULT (user-confirmed)

| Token (existing name) | New value | Note |
|---|---|---|
| `--color-bg` | `#161210` | warm near-black (replaces blue-slate `#0f172a`) |
| `--color-surface` | `#241D17` | cocoa |
| `--color-bg-alt` | `#1C1612` | between bg and surface |
| `--color-primary` | `#E3A92B` | kente gold |
| `--color-primary-dark` | `#B8860B` | antique gold (hover/AA fallback) |
| `--color-secondary` | `#1B5E3A` | forest green (replaces pink) |
| `--color-accent` | `#CE1126` | Ghana red — SPARINGLY: badges, error states, never large fields |
| `--color-text` | `#FAF3E0` | warm cream |
| `--color-text-muted` | `#C9BCA4` | warm muted (AA on bg — verify ≥4.5:1) |
| `--gradient-primary` | `linear-gradient(135deg, #E3A92B 0%, #F5C969 100%)` | gold→amber |
| `--gradient-hero` | gold→amber with a deep-green stop | replaces indigo→purple→pink |

### Light theme (toggle)

Warm cream `#FAF6EE` bg, `#FFFFFF` surface, cocoa text `#241D17`, muted `#6B5D4A`, primary gold `#B8860B` (deeper for contrast on cream; `#E3A92B` reserved for large fills with dark text), same green/red accents.

**Default flip:** wherever the default theme is set (BaseLayout's inline theme script + any `data-theme` initial value), default becomes `dark`; light remains one toggle away; stored user preference respected. The FOUC-prevention script order must keep working.

**Contrast gate (before any component work):** verify every token pair used for text/interactive elements meets AA (4.5:1 text, 3:1 large/UI). Known-good anchors: `#E3A92B` on `#161210` ≈ 8:1; gold buttons must carry DARK text (`#161210`), never white. Red `#CE1126` on dark fails AA for small text — red is never used for body-size text on dark.

## 2. Typography

- **Display font:** Fraunces (variable, self-hosted woff2, latin subset, ~45KB, `font-display: swap`, preloaded in BaseLayout). Applied to `h1-h3`, `.hero-title`, stat numerals, section headers via the existing heading styles — introduce `--font-display` token consumed by those rules.
- **Body:** unchanged system stack (performance).
- Exactly ONE font file ships. No Google Fonts CDN (self-host in `public/fonts/`).

## 3. Motif system (two new units)

### `src/styles/motifs.css` (imported by design-system.css or BaseLayout)

Pure-CSS kente utilities (repeating-linear-gradient — zero images):

- `.kente-divider` — full-width 6-8px woven strip (gold/green/black/red blocks per the approved mockup) used between major homepage sections (sparingly: ~3 placements).
- `.kente-edge` — 4px top accent for cards/CTAs.
- `.kente-hero-band` — the signature strip rendered directly under the site header on the hero (per approved mockup).
- All decorative: `aria-hidden` not needed for CSS backgrounds; ensure they never carry content.

### `src/components/AdinkraIcon.astro`

Props: `symbol` (enum below), `size` (default 24), `class`. Renders inline SVG, `aria-hidden="true"` + `role="presentation"` (pure decoration per user's visual-only choice); stroke/fill uses `currentColor` so tokens drive color.

| Symbol key | Adinkra | Mapped use |
|---|---|---|
| `ananse` | Ananse Ntontan (spider's web) | web development service icon; chatbot toggle mark; loading accent |
| `sankofa` | Sankofa (bird) | portfolio / case studies |
| `eban` | Eban (fence) | security / client portal |
| `nkyinkyim` | Nkyinkyim (twisting) | agile process / services |
| `dwennimmen` | Dwennimmen (ram's horns) | about / strength+humility |
| `funtunfunefu` | Funtunfunefu Denkyemfunefu | collaboration / team |
| `nea-onnim` | Nea Onnim No Sua A Ohu | Open Build / learning |
| `gye-nyame` | Gye Nyame | footer mark |

SVGs are simplified, single-path-friendly interpretations drawn for 24px legibility (heavier stroke, geometric) — accuracy of spirit over museum fidelity. Each gets a code comment naming the symbol and meaning (developer-facing only — no visible copy).

## 4. Application pass (preserve Phase 2 structure exactly)

Per-component re-skin: hero (gold CTA with dark text, kente-hero-band, gold text-gradient), Header (active/hover gold), Services (AdinkraIcon replaces generic icons), PortfolioHomepage (gold metric chips, kente-edge on cards), Testimonials (gold stars/avatars keep per-row gradient token), ProofBand (gold stat numerals, strip placement), AIEstimatorCTA, BuiltInTheOpen (badge gold-bordered), HomeFAQ, Contact, Footer (kente top border + gye-nyame mark), ConsentBanner (inherits tokens — verify its hardcoded fallbacks updated), Chatbot toggle (gold + ananse mark), estimator/booking/contact/quiz/analyzer pages (token-driven; spot-fix hardcoded values), 404.

**Hardcoded-hex sweep:** grep all of `src/` + `public/` for `#6366f1`, `#818cf8`, `#4f46e5`, `#ec4899`, `#8b5cf6` and other indigo/pink/purple values — replace with tokens or new values (component fallbacks like `var(--color-primary, #6366f1)` get new fallbacks). `dark-mode-fixes.css` audited the same way (its forced colors must match the warm palette).

**Dead dark-rule repair rides along:** the ~9 components with known dead `[data-theme="dark"]` scoped rules get the `:global()` fix when touched in this pass (dark is now the default theme — these bugs become visible).

## 5. Email + OG

- `emailShell` in `src/lib/email.ts`: header bar becomes a CSS kente strip (table-safe: a row of colored `<td>`s or a repeating-linear-gradient with solid fallback) + gold wordmark on cocoa; body stays white card (email-client safe); footer keeps "Powered by Hodges & Co."
- OG image (`public/` — locate the current one referenced in BaseLayout meta): regenerate to the new identity (cocoa bg, gold headline, kente strip). Logo itself UNTOUCHED (parent-brand rule).

## 6. Verification

- **Contrast audit:** scripted check of token pairs (small Node script or manual matrix in the PR) — every pair AA.
- **Visual review (Playwright):** homepage + estimator + booking + contact at 360/768/1280, BOTH themes, reduced-motion and normal; screenshots reviewed against the approved mockup direction by a dedicated review agent. The signature checks: hero band renders, gold CTA has dark text, no leftover indigo/pink anywhere on screen (pixel-sample a few known regions), light theme is cream not white-blue.
- **Performance:** Lighthouse on preview — LCP no worse than production baseline; total font payload ≤ 60KB; no new images on critical path.
- **Regression:** all 10 GA4 events still fire; consent banner functional; admin pages render (tokens inherit — no motif work, but they must not break); smoke test green.
- Preview-deploy gate before merge, as established.

## Out of scope

Copy/language changes (incl. Adinkra meaning tooltips — possible later layer), photography/AI imagery, logo redesign, admin-page motif styling, blog/content, live-demo hero, favicon redesign (only if current favicon is indigo-dependent — then minimal gold recolor, flagged at merge).
