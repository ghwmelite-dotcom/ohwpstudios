# Premium admin editors and GitHub portfolio — production release

Released 22 November 2026 at https://ohwpstudios.org.
Pages deployment: https://89527b27.ohwpstudios.pages.dev.
Application commit: c1aaa1e.

## Delivered

Premium Homepage, Services, About and Footer editors with grouped full-width fields and live text previews; a coherent portfolio workspace, publication filters, source links and full-editor deep links. The canonical editor retains category, metric and publication fields correctly; unchecked publication is persisted. Service actions use event listeners without weakening CSP. Public collection/detail pages reflect CMS publication and edits, with storage failures failing closed.

Eight reviewed public GitHub projects were imported and published under the owner's deployment approval: AfriLab, CediSense, Ask Ozzy, FuneralPress, Brilla, InboxGuard, OHCS E-Library and xG Oracle. New studies use labelled conceptual illustrations and honest source-backed descriptions. A repeated import added zero duplicates and preserved all eight entries.

Final production inspection found 14 historical example rows (migrations 013 and 0037), including unverified client/performance claims. They were preserved byte-for-byte in admin storage. The public read filter retains the existing demo exclusions and excludes migration-0037 examples unless an administrator adds a repository source. Dashboard cards identify these retained records as legacy examples and omit public case-study links. This prevents unexpectedly publishing old claims while connecting the CMS to the public portfolio. No client record or original project row was deleted, overwritten or unpublished.

## Migration and preservation

Only `052_portfolio_repository_provenance.sql` was applied remotely: three nullable columns on portfolio_projects. Private full database exports before migration, after migration and after import are in ignored `.wrangler/premium-cms-release`. No backups, credentials or account tokens were committed.

Rehearsal, post-migration and final comparisons passed across all 71 original tables: every original row remains unchanged, indexes/triggers/views retained, no sequence regression and no new foreign-key violations. Portfolio grew from 14 retained original rows to 22 total records; the eight reviewed studies comprise the public collection.

## Final checks

- Production build, targeted strict TypeScript and diff checks pass.
- 40 tests / 196 assertions pass. New cases cover additive/idempotent import, private and redirected repository rejection, edit preservation, draft visibility, failure-closed reads, historical example retention, fixed-column writes and detail lookup beyond the listing limit. Existing estimator, contact, client ownership, chat, service-worker and weekly editorial tests pass.
- Redacted Gitleaks scan: zero findings.
- 39 live routes passed, including every reviewed case study and previously checked destinations. Five new SVG visuals return 200; live public collection contains exactly the eight approved project slugs.
- 14 live admin/client/chat validation and authentication checks passed. Three portfolio/editorial admin endpoints additionally reject anonymous access. No security middleware, access roles, session or credential records were changed.
- Browser observed the deployed collection, illustrations, source links and FuneralPress case study; live screenshot accompanies this release.
- Cloudflare API confirms this is the production main-branch deployment, AI and DB bindings retained, and the separate weekly editorial Worker still has exactly `0 9 * * MON`.
- Authenticated CMS save/edit and responsive behavior were browser-tested in the isolated preview. The live admin browser session had expired; production correctly redirected to login. No production password reset or temporary privileged session was introduced to bypass that control. External payment, email and signed-in client transactions were not repeated in production for this scoped UI release.

## Rollback

Previous Pages deployment: https://6421fee1.ohwpstudios.pages.dev. A Pages rollback can retain additive columns and imported records; do not restore a full database snapshot over newer client activity. Original records and their publication flags are untouched. The approved new entries can be individually unpublished through the existing authenticated project manager if required.
