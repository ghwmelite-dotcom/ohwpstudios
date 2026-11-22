# Premium CMS and GitHub portfolio — review preview

Date: 22 November 2026. Status: implemented and locally verified; **not deployed**.

## Review

- Signed-in admin preview: http://localhost:8870/admin/dashboard — Homepage, Services and Portfolio tabs.
- Public collection: http://localhost:8870/portfolio.
- Full editor: http://localhost:8870/admin/portfolio.
- Preview uses an isolated temporary D1 database, synthetic accounts and no production mail/provider credentials. Existing production accounts will not sign into this sandbox; use the already signed-in browser tab.

## Design and behavior

- Homepage, Services, About and Footer fields now own their scoped styles: grouped ivory editing cards, generous full-width fields, character counts, navy/gold live copy previews and responsive single-column layouts.
- Services preview follows the software, AI or trading field being edited. Existing field keys, save endpoints and service catalogue remain intact.
- Portfolio tab reads the canonical project manager API (`projects`), with images, publication filters, safe source links and working editor deep links. This fixes the empty dashboard caused by the previous `portfolio` response assumption.
- Canonical project editor fixes category hydration, metric field mapping, rooted image URLs and unchecked publication flags. Service actions use event listeners, preserving the existing CSP.
- Public portfolio and detail pages now reflect published CMS edits. Explicit drafts hide previously hardcoded fallback projects. Database failures fail closed. Original three approved projects remain available when no matching CMS record exists.
- New studies have original SVG conceptual illustrations, clearly distinguished from product screenshots. No invented customer endorsements, adoption metrics or financial performance claims.

## Curated projects

Repository metadata and README evidence reviewed: AfriLab, CediSense, ask-ozzy, funeral-press, brilla-study-platform, Inbox-Guard, ohcs-elibrary and xG-Oracle, all under https://github.com/ghwmelite-dotcom.

Exact public source URLs, reviewed README commit SHAs and branches are in `src/data/github-portfolio.ts`. Live public visibility, ownership, non-fork and non-archived status are checked again at import; no GitHub credential is used. All six offered live project destinations returned HTTP 200.

Import is additive and idempotent. Existing slugs/repositories and owner edits are preserved. The three already-public approved entries retain their public status when adopted. The five additions start as unpublished, unfeatured drafts. In this isolated preview only, all eight have been made visible so the complete public collection can be reviewed.

## Verification

- Production build passes; targeted strict TypeScript check passes.
- 39 tests, 193 assertions pass, including real SQLite SQL execution, duplicate import protection, edit preservation, private/redirect rejection, draft visibility, storage failure handling, fixed-column writes, stable slugs and detail lookup beyond the listing limit.
- Local Cloudflare runtime import: 8 added; repeated import: 0 added, 8 preserved. Anonymous import/read denied (401), missing CSRF denied (403); admin portfolio responses use no-store.
- Browser verified admin login, homepage live preview/save/restore, Services preview/save, retained service create/edit, project edit deep link, category/source hydration, draft save/reopen, republication, project visuals and source links.
- 390px responsive checks: Homepage and Services fields stay within the viewport; admin/public collections become one column; detail image fits; no horizontal document overflow.
- 20 checked local page/API destinations returned 200, including all 8 details, About, Contact, estimator, client login, service page, blog, admin and editorial controls. This is scoped regression verification, not a claim that every external integration was exercised.
- Gitleaks scan: zero findings. Authentication, central CSRF/session checks, client tenant controls, contact flows and weekly editorial worker were retained.

## Deployment boundary

Migration `052_portfolio_repository_provenance.sql` only adds three nullable provenance columns. It has **not** been applied to production. Deployment must apply this migration before shipping the new portfolio reads, then run the protected import and review/publish desired drafts. No original client records or production portfolio/content were changed for this preview.

Screenshots: homepage-editor.jpg, services-editor.jpg, portfolio-workspace.jpg, portfolio-cards.jpg, public-project-studies.jpg, project-detail.jpg, homepage-mobile.jpg. API and route evidence are alongside this file.
