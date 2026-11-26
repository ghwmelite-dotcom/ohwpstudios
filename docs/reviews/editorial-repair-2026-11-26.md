# Weekly editorial generator repair - 26 November 2026

Status at initial investigation: implementation validated locally, not yet deployed. Subsequently released under explicit owner approval; see docs/releases/2026-11-26-editorial-repair/release.md for final production evidence.

## Diagnosis

The Monday 23 November run executed but failed article validation on attempt 1 of 2. No draft was saved. The older 16 November audit remains failed at attempt 2 of 2. The original raw responses were not retained, so the precise rejected field in those historical runs cannot be established.

An isolated reproduction of the old request produced a 152-character title against a 140-character application limit. The old provider request selected JSON mode but only supplied the article schema in prompt text.

## Repair

Pass the article schema through Cloudflare Workers AI response_format, request a concise title, retain independent application validation, explain field failures safely in the admin, and allow one scheduled format/content retry under the existing two-attempt ledger. Source/provider failures do not automatically retry. Draft-only insertion, pause checks, leases, duplicate checks, source restrictions, escaped rendering, token limits, authenticated controls and CSRF protections remain in place.

## Evidence

- Full current working-tree suite: 85 tests passed, 574 assertions; includes other concurrent workspace work.
- Targeted strict TypeScript check passed for the engine, admin presentation and Worker.
- Astro production build passed.
- Isolated REST test produced a validated 806-word article.
- Native Cloudflare binding test failed JSON validation on its first attempt, then produced a validated 1,061-word draft on its permitted second attempt. This demonstrates the need for bounded retries, not guaranteed future success.
- Production recovery was stopped before any write because a fetched reference digest changed relative to the isolated response. No production inference call, retry claim, article insert or publication occurred during recovery.
- Final live read confirmed the 23 November ledger is still failed, attempt 1, post_id NULL; the 16 November ledger remains failed, attempt 2.
- Temporary QA Worker and QA database were deleted successfully. Private response data, logs and credentials are excluded from this review document and source control.

## Pending release

Review the diff, deploy the editorial Worker and admin application, then use the remaining current-week retry through the authenticated admin. Do not reset historic weekly counters or publish generated content automatically. Preserve concurrent AI-workspace and billing changes when preparing a release; this repair does not authorize deploying those unrelated changes.
