# Editorial generator repair and service draft campaign

Released 26 November 2026 under explicit owner approval. Production: https://ohwpstudios.org. Pages deployment: https://df3f4ca8.ohwpstudios.pages.dev. Editorial Worker version: a5f9bbee-e1d0-4031-aadb-2c8a7ce17de8.

## Result

The 23 November weekly slot succeeded on its permitted second attempt. Post 65 contains the 1,094-word generated article, published=0 and published_at=NULL. Its search description was editorially tightened. The historical 16 November failed run and its exhausted counter were preserved.

Eight additional AI Workspace Setup & Support drafts were created using Cloudflare Workers AI and editorially revised for specific client decisions. Posts 66–73 remain unpublished, with complete metadata, direct answers, FAQs, reference links, service links and eight distinct illustrated covers. Revised rendered article lengths are 606–640 words, including references and the service handoff. They are review material, not automatically published or independently fact-checked final articles. Original AI responses were not blindly accepted as finished marketing copy. The campaign used a separate disposable local ledger and idempotent content markers; it did not reset or add production weekly slots. Conditional updates guarded unpublished state and concurrent owner edits.

Future weekly runs interleave eight service intents with the existing studio topics. The next slot is Monday 30 November at 09:00 Accra/UTC. Frequency remains weekly. Search intent and useful answers guide the articles; no traffic, search-ranking or answer-engine citation guarantee is made.

## Implementation

Provider-side JSON schema, application validation, concise title instructions, safe field-level diagnostics and one bounded automatic scheduled format/content retry. Embedded serialized article structure in prose is rejected. Topic-specific section planning replaces the previously universal booking-oriented structure. Cloudflare Workers AI remains the sole inference provider; 5,000 output-token cap per attempt remains. No client records or secrets enter article prompts.

Pause controls, atomic weekly claims, lease checks, two-attempt cap, source restrictions, duplicate checks, escaped rendering, draft-only insertion, session/CSRF protections and private admin controls remain. Worker has only AI and existing DB bindings; workers.dev and preview URLs remain disabled. Cron remains 0 9 * * MON. No migration, provider credential, billing activation or security-header change was made.

## Release isolation

The approved live AI workspace service, navigation, public guide, private handbook and enquiry form were included. Separate in-progress billing code was excluded using an isolated build snapshot, leaving the shared checkout untouched. Live FAQ text and pre-billing legal pages were preserved. Existing payment webhook behaviour was retained. Full working-tree build output was not deployed blindly.

## Checks

- 87 repository tests passed, 595 assertions; this suite also covers separate current workspace work. Targeted strict TypeScript passed for the released editorial engine, admin code, themes and Worker. Isolated release production build passed.
- Gitleaks scan of changed editorial source/tests: no findings. No prompts, credentials, raw model responses or database backups committed.
- 41 public routes returned 200; all nine baseline public portfolio projects remained visible, with approved fallback/legacy exclusion rules preserved. Five existing project images and eight new editorial illustrations returned 200.
- 14 live security checks passed, plus four portfolio/editorial admin guards. Unauthenticated generate POST returned 401; the private handbook redirected to admin login.
- All nine new draft article URLs returned 404. Public blog, blog sitemap and llms.txt excluded their slugs. Published post count stayed unchanged.
- Full before/after snapshots compared across 74 tables: every pre-existing record unchanged except the authorised current-week editorial run. Schema/indexes/triggers unchanged, sequences did not regress, no new foreign-key violations. Exactly nine new blog rows, all drafts.
- No production authenticated admin session was bypassed. Live guards and data state were checked directly; owner review/publishing remains in the normal authenticated admin.

See adjacent JSON evidence. Local backups, generation usage details and raw responses remain ignored in .wrangler. This was an authorised immediate retry/campaign, not evidence that the future Monday cron has already executed.
