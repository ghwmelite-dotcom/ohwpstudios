# Kente Thread Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the indigo/pink template aesthetic with the approved "Kente Thread" Ghanaian identity — warm dark-default palette, kente CSS motifs, Adinkra SVG icon language, Fraunces display type — without touching copy, structure, or conversion mechanics.

**Architecture:** Token values change, token names don't (the admin theme-customizer and every component depend on the names). Identity ships in three layers: (1) `design-system.css` value revolution + dark-default flip, (2) a motif layer (`motifs.css` kente utilities + `AdinkraIcon.astro` SVG library), (3) a per-component application pass driven by a scripted hex-sweep with an explicit replacement map. Email/OG carry the identity off-site.

**Tech Stack:** Astro 4, CSS custom properties, @fontsource-variable/fraunces (self-hosted), inline SVG, Playwright for visual verification, Resend email HTML (table-safe).

**Spec:** `docs/superpowers/specs/2026-06-12-kente-thread-design.md`

**Verified facts (from exploration):**
- Tokens at `src/styles/design-system.css:3-79` (`:root`) and `:82-93` (`[data-theme="dark"]`); 742 lines total. Headings already use `var(--font-display)` (line 138), currently `'Cal Sans', 'Inter', …` — Cal Sans is never loaded.
- Default theme: `BaseLayout.astro:262-264` inline FOUC script `localStorage.getItem('theme') || 'light'`. Toggle in `Header.astro` (~960-980), localStorage key `theme`.
- Admin theme overrides (`BaseLayout.astro:327-391`): `/api/page-init` data can set `--color-primary/-dark/-light`, `--color-secondary`, `--color-accent`, `--color-highlight*`, `--gradient-primary`, `--gradient-highlight`, and Google-Fonts-load `font_heading`/`font_body`. **If D1 stores old indigo values, they stomp the new palette at runtime — Task 9 must align the data.**
- Hex inventory: `6366f1`×192 (46 files), `ec4899`×110 (37), `8b5cf6`×51 (20), `818cf8`×11, `a5b4fc`×11 (incl. dark-mode-fixes.css), `4f46e5`×10, `7c3aed`×2, `4338ca`×1. Plus the hero/chatbot gradient trio `667eea`/`764ba2`/`f093fb` and `rgba(99, 102, 241, …)` / `rgba(236, 72, 153, …)` / `rgba(139, 92, 246, …)` forms.
- Inter loads from Google Fonts CDN (`BaseLayout.astro:124-127`).
- OG: `public/og-image.jpg`, 1200×630 JPEG, referenced as `/og-image.jpg` (`BaseLayout.astro:29`). Favicon: `public/favicon.svg` (614 B) + `public/icons/` pack.
- Email header gradient: `src/lib/email.ts:51`.
- Chatbot toggle gradient `Chatbot.astro:271-276`; ConsentBanner fallbacks at lines 23-76; Services icons are inline SVG paths colored `var(--color-primary)`.

**Canonical palette (single source for every task):**

| Name | Hex | Usage |
|---|---|---|
| Kente gold | `#E3A92B` | primary |
| Antique gold | `#B8860B` | primary-dark / light-theme primary |
| Light gold | `#F5C969` | primary-light / gradient end |
| Deep gold | `#8B6508` | darkest gold (pressed states) |
| Forest green | `#1B5E3A` | secondary |
| Ghana red | `#CE1126` | accent — badges/errors only, never large fields, never small text on dark |
| Warm black | `#161210` | dark bg / text-on-gold |
| Cocoa | `#241D17` | dark surface / light-theme text |
| Warm dark alt | `#1C1612` | dark bg-alt |
| Cream | `#FAF3E0` | dark-theme text |
| Warm cream | `#FAF6EE` | light bg |
| Warm muted (dark) | `#C9BCA4` | dark text-muted |
| Warm muted (light) | `#6B5D4A` | light text-muted |

**Testing note:** No unit-test framework (by design). Per-task gate = `npm run build` + targeted checks; Playwright empirical verification is MANDATORY for Tasks 2, 6, 7 and the final task (this is a visual phase — "build passes" proves nothing about looks).

---

### Task 1: Fraunces display font (self-hosted) + drop the Inter CDN

**Files:**
- Modify: `package.json` (+1 dep)
- Modify: `src/layouts/BaseLayout.astro` (remove Google Fonts link ~124-127; add fontsource import)
- Modify: `src/styles/design-system.css` (`--font-display`, `--font-sans` values only)

- [ ] **Step 1: Install**

```powershell
npm install @fontsource-variable/fraunces
```

- [ ] **Step 2: Import the font**

In `BaseLayout.astro` frontmatter add:

```ts
import '@fontsource-variable/fraunces';
```

(Vite bundles + hashes the woff2; `font-display: swap` is fontsource's default.) DELETE the Google Fonts `<link>` block for Inter (lines ~124-127, including any preconnect lines that exist solely for it).

- [ ] **Step 3: Token values**

In `design-system.css`:

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-display: 'Fraunces Variable', Georgia, 'Times New Roman', serif;
```

(Heading rules already consume `--font-display` — no other changes. Body intentionally becomes the system stack: Inter's CDN request disappears, ~0 net new payload because Fraunces replaces it.)

- [ ] **Step 4: Verify**

`npm run build` → exit 0. Confirm exactly one font file in `dist/_astro/*.woff2` (fontsource variable = 1 latin file; if italic variants got pulled in, import the non-italic path `@fontsource-variable/fraunces/index.css` only). Check the built homepage HTML no longer references fonts.googleapis.com. Dev server: h1 renders a serif display face.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json src/layouts/BaseLayout.astro src/styles/design-system.css
git commit -m "feat(identity): Fraunces display font, self-hosted; drop Inter CDN"
```

---

### Task 2: Token revolution + dark default

**Files:**
- Modify: `src/styles/design-system.css:3-93` (values only — names immutable)
- Modify: `src/layouts/BaseLayout.astro:262-264` (default flip)

- [ ] **Step 1: `:root` (light theme) value swap**

```css
--color-primary: #B8860B;
--color-primary-dark: #8B6508;
--color-primary-light: #E3A92B;
--color-secondary: #1B5E3A;
--color-accent: #CE1126;
--color-highlight: #1B5E3A;
--color-highlight-dark: #14492D;
--color-highlight-light: #2E7D4F;

--gradient-primary: linear-gradient(135deg, #B8860B 0%, #E3A92B 100%);
--gradient-hero: linear-gradient(135deg, #E3A92B 0%, #C98E1B 50%, #1B5E3A 100%);
--gradient-card: linear-gradient(135deg, rgba(227, 169, 43, 0.10) 0%, rgba(27, 94, 58, 0.10) 100%);
--gradient-highlight: linear-gradient(135deg, #1B5E3A 0%, #2E7D4F 100%);
--gradient-mesh: radial-gradient(at 40% 20%, rgba(227, 169, 43, 0.25) 0px, transparent 50%),
                 radial-gradient(at 80% 0%, rgba(27, 94, 58, 0.18) 0px, transparent 50%),
                 radial-gradient(at 0% 50%, rgba(245, 201, 105, 0.15) 0px, transparent 50%),
                 radial-gradient(at 80% 100%, rgba(206, 17, 38, 0.08) 0px, transparent 50%);
--gradient-glow: radial-gradient(circle at center, rgba(227, 169, 43, 0.2) 0%, transparent 70%);

--color-bg: #FAF6EE;
--color-bg-alt: #F3EDE0;
--color-surface: #FFFFFF;
--color-text: #241D17;
--color-text-muted: #6B5D4A;
--color-border: #E5DCC8;

--glass-bg: rgba(255, 253, 247, 0.7);
--glass-border: rgba(36, 29, 23, 0.08);
```

(Replace the mesh's hsla stops with the warm set above — same property name, same number of stops or fewer.)

- [ ] **Step 2: `[data-theme="dark"]` block**

```css
[data-theme="dark"] {
  --color-bg: #161210;
  --color-bg-alt: #1C1612;
  --color-surface: #241D17;
  --color-text: #FAF3E0;
  --color-text-muted: #C9BCA4;
  --color-border: #3A2F25;
  --glass-bg: rgba(36, 29, 23, 0.7);
  --glass-border: rgba(250, 243, 224, 0.08);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  /* Gold pops on warm dark: primary family brightens */
  --color-primary: #E3A92B;
  --color-primary-dark: #B8860B;
  --color-primary-light: #F5C969;
  --gradient-primary: linear-gradient(135deg, #E3A92B 0%, #F5C969 100%);
}
```

(NOTE: adding `--color-primary*` and `--gradient-primary` to the dark block is NEW — dark needs the brighter gold. Verify no specificity surprise: the admin page-init override sets inline style on `:root` via `documentElement.style.setProperty`, which beats both blocks — that's Task 9's territory.)

- [ ] **Step 3: Default flip**

`BaseLayout.astro` FOUC script: `localStorage.getItem('theme') || 'light'` → `|| 'dark'`. Check `Header.astro`'s toggle logic for any `|| 'light'` default assumptions and align (read ~lines 960-980).

- [ ] **Step 4: Contrast gate (MANDATORY before commit)**

Compute and report the matrix (manual calc or quick Node script) — every pair must pass:

| Pair | Requirement |
|---|---|
| `#FAF3E0` on `#161210` / `#241D17` | ≥ 4.5 |
| `#C9BCA4` on `#161210` | ≥ 4.5 |
| `#E3A92B` on `#161210` (large/UI) | ≥ 3.0 |
| `#161210` on `#E3A92B` (button text) | ≥ 4.5 |
| `#241D17` on `#FAF6EE` | ≥ 4.5 |
| `#6B5D4A` on `#FAF6EE` | ≥ 4.5 |
| `#B8860B` on `#FAF6EE` (large/UI) | ≥ 3.0 |
| `#FFFFFF` on `#1B5E3A` | ≥ 4.5 |

If any fail, darken/lighten the offending token (stay in family) and note the adjustment.

- [ ] **Step 5: Verify + commit**

`npm run build` → exit 0. Playwright: homepage in BOTH themes at 1280px — dark is warm (sample `body` background-color = rgb(22,18,16)), light is cream not white-blue; gold buttons have dark text (sample computed color of the hero CTA). First-visit (cleared localStorage) loads DARK.

```powershell
git add src/styles/design-system.css src/layouts/BaseLayout.astro src/components/Header.astro
git commit -m "feat(identity): kente palette token revolution, dark by default, AA verified"
```

---

### Task 3: Kente motif utilities

**Files:**
- Create: `src/styles/motifs.css`
- Modify: `src/styles/design-system.css` (one `@import './motifs.css';` at top, or import in BaseLayout next to design-system — match how design-system.css itself is loaded)

- [ ] **Step 1: Create `src/styles/motifs.css`**

```css
/* Kente Thread motif layer — pure CSS, zero image weight.
   Strip pattern interprets kente strip-weave: gold-dominant with
   green/black/red blocks. Decorative only — never carries content. */

.kente-divider {
  height: 6px;
  width: 100%;
  border: 0;
  background: repeating-linear-gradient(
    90deg,
    #E3A92B 0 48px,
    #1B5E3A 48px 72px,
    #161210 72px 96px,
    #CE1126 96px 108px,
    #E3A92B 108px 156px,
    #161210 156px 168px
  );
}

.kente-hero-band {
  height: 8px;
  width: 100%;
  background: repeating-linear-gradient(
    90deg,
    #E3A92B 0 48px,
    #1B5E3A 48px 72px,
    #161210 72px 96px,
    #CE1126 96px 108px,
    #E3A92B 108px 156px,
    #161210 156px 168px
  );
}

.kente-edge {
  position: relative;
  overflow: hidden;
}
.kente-edge::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: repeating-linear-gradient(
    90deg,
    #E3A92B 0 24px,
    #1B5E3A 24px 36px,
    #161210 36px 48px,
    #CE1126 48px 54px,
    #E3A92B 54px 78px
  );
}
```

(Hex literals are intentional here — the strip IS the brand mark; it must not shift when admins re-theme. On the dark bg the black blocks read as gaps — correct, that's the weave. Use `<hr class="kente-divider" aria-hidden="true">` or a `<div>`; never put content inside.)

- [ ] **Step 2: Wire the import, verify, commit**

`npm run build` → exit 0 (utilities unused until Task 6).

```powershell
git add src/styles/motifs.css src/styles/design-system.css
git commit -m "feat(identity): kente strip motif utilities (pure CSS)"
```

---

### Task 4: AdinkraIcon component

**Files:**
- Create: `src/components/AdinkraIcon.astro`

- [ ] **Step 1: Create the component**

Structure (the 8 symbols are authored as simplified geometric interpretations on a 24×24 grid, stroke-based, legible at 20-32px; `ananse` example below is complete — author the remaining 7 in the same style):

```astro
---
// Adinkra symbol library — simplified geometric interpretations drawn for
// small-size legibility (spirit over museum fidelity). Decorative per the
// visual-only design decision: aria-hidden, no visible meaning copy.
// Symbol meanings (developer reference):
//   ananse        — Ananse Ntontan, spider's web: wisdom & creativity (web dev!)
//   sankofa       — return and get it: learn from the past (case studies)
//   eban          — fence: security, safety (client portal)
//   nkyinkyim     — twisting: adaptability (agile process)
//   dwennimmen    — ram's horns: humility with strength (about)
//   funtunfunefu  — shared crocodiles: unity in diversity (collaboration)
//   nea-onnim     — he who does not know can learn (Open Build)
//   gye-nyame     — supremacy of God: most iconic Adinkra (footer mark)
export type AdinkraSymbol =
  | 'ananse' | 'sankofa' | 'eban' | 'nkyinkyim'
  | 'dwennimmen' | 'funtunfunefu' | 'nea-onnim' | 'gye-nyame';

interface Props {
  symbol: AdinkraSymbol;
  size?: number;
  class?: string;
}
const { symbol, size = 24, class: className } = Astro.props;
---
<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.75"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  role="presentation"
  class={className}
>
  {symbol === 'ananse' && (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
      <line x1="18.4" y1="5.6" x2="5.6" y2="18.4" />
    </>
  )}
  <!-- remaining 7 symbols in the same conditional pattern -->
</svg>
```

Authoring requirements for the other 7: same stroke style; `sankofa` = stylized bird with head turned back over an egg-circle; `eban` = fence of 3-4 vertical posts with linked tops inside a rounded enclosure; `nkyinkyim` = vertical zigzag/serpentine; `dwennimmen` = two facing spiral horns (four arcs); `funtunfunefu` = two crossed long ovals sharing a center (X of two stomachs); `nea-onnim` = open spiral curl; `gye-nyame` = the characteristic asymmetric swirl with radiating notches (simplify to a bold comma-swirl + 3 notch lines). Verify each is recognizable at 24px by rendering a test page in dev.

- [ ] **Step 2: Verify + commit**

`npm run build` → exit 0. Dev: temporarily render all 8 at 24/32/48px on a scratch page (delete after), screenshot via Playwright, and include the screenshot path in your report — legibility is the acceptance bar.

```powershell
git add src/components/AdinkraIcon.astro
git commit -m "feat(identity): Adinkra SVG icon library (8 symbols, currentColor)"
```

---

### Task 5: Scripted hex sweep

**Files:**
- Modify: ~45 files across `src/` and `public/` (mechanical)

- [ ] **Step 1: Run the replacement map**

PowerShell script over `src/**` and `public/**` text files (extensions: astro,css,ts,js,mjs — EXCLUDE `dist`, `node_modules`, `docs`, `migrations`, `.superpowers`, `public/og-image.jpg` binaries). Case-insensitive on hex:

| Old | New |
|---|---|
| `#6366f1` | `#E3A92B` |
| `#4f46e5` | `#B8860B` |
| `#818cf8` | `#F5C969` |
| `#ec4899` | `#F5C969` |
| `#8b5cf6` | `#E3A92B` |
| `#a5b4fc` | `#F5C969` |
| `#7c3aed` | `#B8860B` |
| `#4338ca` | `#8B6508` |
| `#667eea` | `#E3A92B` |
| `#764ba2` | `#1B5E3A` |
| `#f093fb` | `#F5C969` |
| `rgba(99, 102, 241` | `rgba(227, 169, 43` |
| `rgba(236, 72, 153` | `rgba(245, 201, 105` |
| `rgba(139, 92, 246` | `rgba(227, 169, 43` |

Also run the spaceless rgba variants (`rgba(99,102,241` etc.). After replacement, grep to confirm ZERO remaining occurrences of any old value in src/ + public/ (report counts before/after). design-system.css should already be clean from Task 2 — the sweep catches fallbacks and component-scoped styles.

- [ ] **Step 2: Sanity pass on the diff**

`git diff --stat` then skim the largest files: replacements must only appear in color positions (style attributes, CSS values, canvas/JS color strings). Anything weird (a hex inside an ID/hash/content string) — revert that instance by hand. Known intentional survivors: none (the kente motif literals use the NEW palette).

- [ ] **Step 3: Verify + commit**

`npm run build` → exit 0. Dev homepage quick visual: no indigo/pink anywhere.

```powershell
git add -A src public
git commit -m "feat(identity): sweep hardcoded indigo/pink to kente palette (mapped replace)"
```

---

### Task 6: Component application pass A — homepage identity

**Files:**
- Modify: `src/components/HeroWorld.astro`, `src/components/Header.astro`, `src/components/Services.astro`, `src/components/ProofBand.astro`, `src/components/BuiltInTheOpen.astro`, `src/components/Footer.astro`, `src/pages/index.astro`

- [ ] **Step 1: Hero + header band**

In `HeroWorld.astro` (or `index.astro` right above the hero — wherever the header ends): add `<div class="kente-hero-band" aria-hidden="true"></div>` as the first element of the hero section so the strip runs under the site header (per approved mockup). Hero CTA: confirm post-sweep the primary button renders gold with DARK text — if the `.btn-primary` rule uses white text, override here or in design-system: `color: #161210;` on gold fills. Hero badge: gold-bordered.

- [ ] **Step 2: Services → Adinkra icons**

In `Services.astro`: import AdinkraIcon; replace the `iconMap`-driven generic SVG with mapped symbols — web/fullstack service → `ananse`, API/backend → `nkyinkyim`, design/UI → `funtunfunefu`, SaaS/product → `eban` (adapt to the REAL service list found in the file/config; any service without an obvious match gets `nkyinkyim`). Keep size/color conventions (`color: var(--color-primary)`).

- [ ] **Step 3: Footer + dividers**

`Footer.astro`: add `border-top: none` and a `kente-divider` div as the footer's first child; add `<AdinkraIcon symbol="gye-nyame" size={20} />` beside the "Powered by Hodges & Co." line (decorative, muted color). In `index.astro`: place `kente-divider` between Portfolio→Testimonials and between EstimatorCTA→BuiltInTheOpen (2 placements + footer = 3 total — sparingly per spec).

- [ ] **Step 4: ProofBand + BuiltInTheOpen accents**

ProofBand stat `strong` elements already use `--gradient-primary` text fill (now gold) — verify. BuiltInTheOpen badge: gold border (token-driven post-sweep — verify). Add `kente-edge` class to the ProofBand section top OR the estimator CTA card (pick ONE — restraint).

- [ ] **Step 5: Empirical verify + commit**

Playwright both themes, 360/1280: hero band renders; Services icons are Adinkra; footer mark present; dividers exactly 3; gold CTA dark text; screenshot set in report.

```powershell
git add src/components src/pages/index.astro
git commit -m "feat(identity): homepage application — hero band, Adinkra services, footer mark, dividers"
```

---

### Task 7: Component application pass B — widgets, funnel pages, dark-rule repairs

**Files:**
- Modify: `src/components/Chatbot.astro`, `src/components/ConsentBanner.astro`, `src/components/LoadingScreen.astro`, `src/components/PWAInstallPrompt.astro`, `src/pages/estimate-project.astro`, `src/pages/booking.astro`, `src/pages/contact.astro`, `src/pages/quiz.astro`, `src/pages/website-analyzer.astro`, `src/pages/404.astro` (if exists), `src/styles/dark-mode-fixes.css`

- [ ] **Step 1: Chatbot toggle** — post-sweep its gradient is gold/green; replace the toggle's chat glyph with `<AdinkraIcon symbol="ananse" size={26} />` (import in Chatbot.astro; keep the unread badge). Verify dark text/contrast on the gold toggle.

- [ ] **Step 2: ConsentBanner** — fallback values post-sweep should be warm; verify the accept button is gold + dark text and hover keeps AA (the old #4338ca→#8B6508 mapping); update the dark-theme fallback literals (`#334155`, `#1e293b` → `#3A2F25`, `#241D17`).

- [ ] **Step 3: Funnel pages** — estimator (step indicators, progress bar, results cost gradient), booking (submit button, focus rings), contact, quiz, analyzer: post-sweep most is automatic; visually inspect each in dev BOTH themes and fix stragglers (screenshots in report). LoadingScreen + PWAInstallPrompt: verify warm.

- [ ] **Step 4: dark-mode-fixes.css audit** — its forced colors must match the warm palette (post-sweep rgba forms are converted; check the file's grays/slates: `#94a3b8`-type slate values reading cold against warm bg → swap to `#C9BCA4` family where they style text). While in components from this task: convert any plain `[data-theme="dark"]` scoped rules to `:global([data-theme="dark"])` (dark is now DEFAULT — these dead rules are now visible bugs).

- [ ] **Step 5: Verify + commit**

Playwright: estimator + booking + contact, both themes, 360/1280, plus chatbot open state and consent banner visible (set localStorage empty + PUBLIC_GA_ID in .env, then delete .env).

```powershell
git add src/components src/pages src/styles/dark-mode-fixes.css
git commit -m "feat(identity): widgets + funnel pages on kente palette; dead dark-rule repairs"
```

---

### Task 8: Email shell re-skin (table-safe kente)

**Files:**
- Modify: `src/lib/email.ts` (emailShell only)

- [ ] **Step 1: Replace the header div**

Email clients (Outlook) don't reliably render CSS gradients — build the strip as a zero-height-risk table row of colored cells + a cocoa header bar:

```ts
export function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F3EDE0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:12px 12px 0 0;overflow:hidden;">
      <tr>
        <td style="height:6px;width:30%;background:#E3A92B;font-size:0;line-height:0;">&nbsp;</td>
        <td style="height:6px;width:15%;background:#1B5E3A;font-size:0;line-height:0;">&nbsp;</td>
        <td style="height:6px;width:15%;background:#161210;font-size:0;line-height:0;">&nbsp;</td>
        <td style="height:6px;width:8%;background:#CE1126;font-size:0;line-height:0;">&nbsp;</td>
        <td style="height:6px;width:32%;background:#E3A92B;font-size:0;line-height:0;">&nbsp;</td>
      </tr>
      <tr>
        <td colspan="5" style="background:#241D17;padding:18px 28px;">
          <span style="color:#E3A92B;font-size:18px;font-weight:800;letter-spacing:.3px;">OhWP Studios</span>
        </td>
      </tr>
    </table>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:28px;color:#241D17;font-size:15px;line-height:1.6;">
      <h1 style="font-size:20px;margin:0 0 16px;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#8a7d68;font-size:12px;margin-top:16px;">
      OhWP Studios — Powered by Hodges &amp; Co.<br>
      <a href="https://ohwpstudios.org" style="color:#B8860B;">ohwpstudios.org</a>
    </p>
  </div>
</body></html>`;
}
```

Also update `emailButton`'s gradient to solid gold + dark text (gradients on buttons are unreliable in email):

```ts
export function emailButton(href: string, label: string): string {
  return `<p style="text-align:center;margin:24px 0;"><a href="${href}" style="background:#E3A92B;color:#161210;text-decoration:none;font-weight:700;padding:13px 28px;border-radius:9999px;display:inline-block;">${label}</a></p>`;
}
```

- [ ] **Step 2: Verify + commit**

`npm run build` → exit 0. Render-check: write the emailShell output to a temp .html and open via Playwright screenshot (strip renders, gold-on-cocoa header, dark-on-gold button). Footer rule intact ("Powered by Hodges & Co.").

```powershell
git add src/lib/email.ts
git commit -m "feat(identity): kente email shell — table-safe strip, gold-on-cocoa, solid gold buttons"
```

---

### Task 9: Admin theme data alignment (remote D1 — prevents runtime palette stomp)

**Files:** none committed (remote data + verification)

- [ ] **Step 1: Inspect what page-init actually serves**

```powershell
Invoke-WebRequest -Uri "https://ohwpstudios.org/api/page-init" -UseBasicParsing | Select-Object -ExpandProperty Content
```

If the JSON `theme` object contains color values (e.g. `color_primary: "#6366f1"`), they will stomp the new tokens at runtime on EVERY page.

- [ ] **Step 2: Align or clear**

Find the storage (likely a `theme_settings`/`site_settings` table — locate via the page-init API source `src/pages/api/page-init.ts` and read which table/keys it queries). Then either UPDATE the stored values to the kente palette (`color_primary` → `#E3A92B`, `color_secondary` → `#1B5E3A`, `color_accent` → `#CE1126`, `color_highlight` → `#1B5E3A`, clear `font_heading`/`font_body` if set to anything) or NULL them out so defaults rule — choose whichever the API's fallback logic makes safest (read it first). Execute via `npx wrangler d1 execute agency-db --remote` ($env:CLOUDFLARE_ACCOUNT_ID="ea2eb3a9813660dfca2a60e594858538"). Quote before/after SELECTs in your report.

- [ ] **Step 3: Re-verify**

`Invoke-WebRequest .../api/page-init` again — theme colors now kente or absent. NOTE in report: the admin theme page still works; admins re-theming later will override gold by design (their tool, their choice).

---

### Task 10: OG image + favicon

**Files:**
- Modify: `public/og-image.jpg` (regenerated)
- Modify: `public/favicon.svg` (recolor only if indigo-dependent)

- [ ] **Step 1: OG art-board**

Write a temp HTML file (1200×630): cocoa `#241D17` background, kente strip across the top (same CSS as motifs), "OhWP Studios" in Fraunces gold `#E3A92B` + the site tagline in cream, gye-nyame outline at low opacity right side. Screenshot at exactly 1200×630 via Playwright, save over `public/og-image.jpg` (JPEG, quality ~85, target ≤120KB). Delete the temp HTML.

- [ ] **Step 2: Favicon check**

Read `public/favicon.svg` (614 B — quick). If it contains indigo/purple fills, recolor to `#E3A92B` (and dark elements to `#161210`). If it's brand-logo artwork with non-indigo colors, LEAVE IT and note it. Do not touch `public/icons/` PNG pack (regeneration out of scope; flag if visibly indigo for a follow-up).

- [ ] **Step 3: Verify + commit**

Open the new og-image.jpg, confirm dimensions/size.

```powershell
git add public/og-image.jpg public/favicon.svg
git commit -m "feat(identity): kente OG image; favicon recolor"
```

---

### Task 11: Full verification + preview gate (MANUAL — user reviews the look)

**Files:** none (process)

- [ ] **Step 1: Regression battery (local)**

1. `npm run build` → exit 0.
2. Playwright matrix: `/`, `/estimate-project`, `/booking`, `/contact` × {dark, light} × {360, 768, 1280} — screenshots; automated checks: no element with computed background/color containing rgb(99, 102, 241) or rgb(236, 72, 153) anywhere (query all elements, sample computed styles); `#page-loader` dismisses; reduced-motion run clean.
3. GA4: consent → dataLayer events fire (estimator_started spot-check).
4. `node scripts/smoke-test.mjs https://ohwpstudios.org` → green (prod untouched so far).

- [ ] **Step 2: Push branch, PR, preview**

Preview URL from preview.yml. Run Lighthouse against the preview homepage: LCP ≤ production baseline + 200ms; report font payload (must be ONE woff2 ≤ 60KB transfer).

- [ ] **Step 3: USER GATE**

Present the preview URL to the user with the screenshot set — the user judges "does this feel like the best of Ghana, premium, ours?" Iterate on feedback BEFORE merge (palette nudges are token-only — cheap). Only merge on explicit user approval. Post-merge: smoke green, spot-check production both themes, update memory.

---

## Done means

- First-time visitors land on the warm dark kente identity; light cream one toggle away; zero indigo/pink pixels site-wide.
- Headings render Fraunces (one self-hosted woff2); body is the fast system stack; Google Fonts CDN gone.
- Kente band under the header, 3 dividers, Adinkra icons in services/footer/chatbot — all CSS/SVG, zero image weight.
- Emails carry the identity (table-safe strip) with Hodges & Co. footer intact.
- Admin theme data aligned so page-init can't stomp the palette.
- AA contrast matrix documented and passing; LCP not regressed; all GA4 events + smoke green; user approved the look on a live preview before merge.
