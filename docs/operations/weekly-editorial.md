# Weekly editorial drafts

The `hodges-studio-editorial` Worker prepares one article per Monday week using Cloudflare Workers AI, D1 and public official reference documents. Normal schedule: `0 9 * * MON` (09:00 Accra/UTC). Its workers.dev and preview URLs are disabled. The website remains the existing Pages application.

## Review and publishing

Open Admin → Blog Posts → Weekly studio drafts. Check the current schedule and run status, then choose **Review article**. Verify the claims, references, metadata, relevance, originality and Ghanaian context. Add specific studio experience only when it is true. Improve weak or repetitive prose; the model is a drafting assistant, not a fact-checking or ranking authority.

A generated post is always `published=0` with `published_at=NULL`. It is absent from public blog listings, article routes, the blog sitemap and the AI-readable index until you explicitly check **Publish this post** and save using the existing editor. No automated publishing endpoint exists.

**Generate this week’s draft** uses the same weekly slot as the scheduled Worker. It preserves an existing completed draft and permits at most one explicit retry of a failed or 20-minute-stale run (two total attempts). Deleting a draft preserves its completed weekly slot and audit history; it does not trigger an automatic replacement.

**Pause weekly drafts** changes the shared server-side setting. The scheduler then skips work, and manual generation is disabled. Pausing during inference also prevents the final draft insert. Resume in the same panel. Previously saved drafts remain editable.

## Content policy

The source-controlled themes in `src/content/editorial-themes.ts` rotate across client questions. Existing editorial titles are supplied to avoid repeated intent. Exact slugs, similar titles and byte-identical generated article text are checked. These checks do not establish semantic uniqueness or replace editorial review.

Each run fetches two approved HTTPS references. Redirects remain on the explicit official-host allowlist; body size, timeout and extracted text length are bounded. Source URL, retrieval time and excerpt digest are recorded. Source text and existing article titles are reference data; no model tools or external actions are exposed. Draft rendering escapes all model prose and uses trusted templates, reference links, cover paths, internal links and byline.

The provider receives the article JSON schema through Cloudflare response_format (json_schema), and the application independently validates the response as structured plain text. Metadata and the direct answer are shortened to safe editorial lengths when needed. Invalid, incomplete or repetitive output records a failed run and saves no post. Serialized article scaffolding embedded in prose is also rejected; section instructions are tailored to the theme instead of imposing a booking workflow on every subject. Original planning advice can have no inline citation; factual guidance should be checked against the reference list. A source link or successful fetch does not prove a model claim is correct.

No client records, contact submissions, chat transcripts, credentials or personal emails are read into generation prompts. The new Worker has only the existing D1 and Workers AI bindings and no public HTTP route. Its code only queries editorial settings, run metadata and blog content; the D1 binding itself is database-scoped, not a table-level permission system. Admin control routes retain the existing authenticated session, CSRF guard and no-store responses.

## Usage and failures

Model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. One call per claimed attempt, capped at 5,000 output tokens; no autonomous repair loops. Normal weekly operation is one draft. A scheduled format/content validation failure receives one automatic retry within the same two-attempt weekly cap. Source and provider failures are not automatically retried. Manual generation remains one explicit attempt using the shared ledger; it cannot exceed the cap. Usage shares the account’s Workers AI allowance with other applications. Quota, source and model failures never publish content or switch to a paid third-party provider. This workflow uses no Anthropic/OpenAI API credential.

Run history exposes safe, human-readable validation explanations, review notes and references; the ledger retains stable field-specific error codes. Historic generic validation failures remain unchanged. Provider error payloads, prompts and credentials are not stored in application logs. Operational Worker logs contain only run key, status and a stable code. Inspect Cloudflare logs/usage if a run fails, then use the bounded retry after resolving the problem. Avoid resetting weekly ledgers to bypass the cap.

## Maintenance

Additive migration: `migrations/051_weekly_editorial_drafts.sql`. Apply only this migration to an existing production database after a backup; do not rerun historical seeds or use the disposable test database seed in production.

Deploy the scheduled Worker separately with:

```powershell
node node_modules/wrangler/bin/wrangler.js deploy --config workers/editorial/wrangler.toml
```

The root Wrangler configuration still deploys the Pages site. Keeping the two configurations separate prevents overwriting existing site bindings. Check the deployed schedule and disabled public URLs after worker updates. Cloudflare states cron changes can take up to 15 minutes to propagate.

There is no automatic claim that a generated page will rank or be cited by an answer engine. Track published articles through actual Search Console/analytics evidence and improve the editorial briefs over time.

## AI workspace service coverage

Eight distinct AI Workspace Setup & Support intents are interleaved with core studio topics: readiness, cost ownership, folder permissions, attended remote setup, business entitlements, acceptance tests, support diagnosis and choosing between workspace assistance and software development. Topic IDs remain stable for prior runs. All generated content remains a draft; new subjects do not raise the one-weekly-slot/two-attempt limit.

A separately authorised one-off campaign on 26 November 2026 created eight Cloudflare AI-assisted drafts and editorially revised them for actual service scope. It did not write extra weekly ledger entries or change the schedule. Those posts have separate cover illustrations and service links. Their content markers identify the campaign; do not rerun imports to replace owner edits. No batch or bulk-publish route was added.
