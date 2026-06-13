# Kodie Chatbot Hardening — Design Spec

**Date:** 2026-06-13
**Status:** Approved by user (design conversation, this session)
**Scope:** Harden the already-live AI chatbot: fix the Gemini-key-in-URL leak, add abuse/cost guards to the public chat endpoints, persist conversations server-side, and centralize the bot's knowledge into one source. Phase 3 sub-project #3.

## Context (audited facts)

The chatbot is NOT on mocks — it already uses real AI:
- `src/pages/api/chat/kodie.ts`: Cloudflare Workers AI `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (FREE), real system prompt (hardcoded, lines ~114-146: services, GHS/USD pricing, contact, brand voice), escalation triggers, rule-based fallback. Reads `locals.runtime.env.AI` + `.DB`. **Does NOT persist messages.** No rate limit, no message-length cap, sends unbounded `conversation_history` to the model.
- `src/pages/api/chat/ai-qualify.ts`: Gemini 2.5 Flash via `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}` — **key in URL query string (leak)**. Extracts projectType/budget/timeline/sentiment, inserts `chat_qualified_leads`, emails hot leads via Resend. Rule-based fallback. No rate limit.
- Widget `src/components/Chatbot.astro` (~1598 lines): welcome form (name+email) → POST `/api/chat/kodie` `{message, conversation_history, userName, userEmail}`; generates a CLIENT-side `conversationId` = `'chat-'+Date.now()+...`; every 3 messages POSTs `/api/chat/ai-qualify`; booking prompt on qualified.
- Tables already exist (unused by kodie): `chat_conversations` (id INTEGER PK, visitor_name/email/phone, visitor_ip, visitor_user_agent, status, started_at, last_message_at, total_messages, visitor_messages, operator_messages, source, …) and `chat_messages` (id, conversation_id FK, message_text, message_type, sender_type [visitor|operator|system], sender_name, is_read, sent_at). `/admin/chat` reads these.
- `src/utils/rate-limit.ts` exists (in-memory per-isolate; `getClientIdentifier()` → CF-Connecting-IP; `RATE_LIMITS.API` 100/min, etc.) — currently unused by chat. Same limiter used by the auth login endpoint.
- `SITE_CONFIG` in `src/config.ts` has name/tagline/services/contact. Currency standard: GHS-primary "GH₵X ($Y)" at ×12.
- Secrets: GEMINI_API_KEY, RESEND_API_KEY present; ANTHROPIC_API_KEY present but unused (leave as-is).
- DEPLOY: GitHub Actions is billing-locked → deploys are MANUAL via `wrangler pages deploy dist --branch=main` after building with prod PUBLIC_* env vars. CF Pages preview env lacks RESEND_API_KEY.

## 1. Security + abuse guards

### Gemini key → header (`ai-qualify.ts`)
Change the fetch URL to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` (no `?key=`) and add header `'x-goog-api-key': GEMINI_API_KEY` (Google's supported header auth). Behavior identical; key no longer in URL/logs/referrers.

### Rate limiting (`kodie.ts`, `ai-qualify.ts`)
Use existing `src/utils/rate-limit.ts`. Add a `CHAT` config (e.g. 20 requests / 60s, block 2 min) and apply both endpoints keyed on `getClientIdentifier(request)` (CF-Connecting-IP). On limit:
- `kodie`: return a friendly bot reply `{ success: true, response: { message: "You're sending messages quickly — give me a few seconds to keep up!", escalate: false } }` with HTTP 200 (don't break the widget UX), OR 429 the widget handles gracefully — choose 200-with-friendly-message to avoid widget error states.
- `ai-qualify`: on limit, return the rule-based fallback result (it already has one) rather than calling Gemini — silently degrades, no paid call.
Accepted limitation: in-memory per-isolate (multiple isolates → higher effective ceiling); a reasonable speed-bump for a free chat endpoint, consistent with the auth limiter. Not upgrading to D1-backed this cycle.

### Message-length + history caps (`kodie.ts`)
- Reject a single `message` over 2000 chars → friendly reply asking to shorten (HTTP 200, escalate false). 
- When building the model context, cap `conversation_history` to the last 10 turns (20 messages) before sending to Workers AI — bounds token cost and blocks history-padding abuse.

## 2. Persist conversations server-side

Reuse the existing `chat_conversations` + `chat_messages` tables so `/admin/chat` lights up.

- `kodie.ts` accepts an optional `conversation_id` (DB integer). On the FIRST message (no id), it INSERTs a `chat_conversations` row: visitor_name/visitor_email from the widget, visitor_ip (CF-Connecting-IP), visitor_user_agent, status 'active', source 'chatbot', started_at/last_message_at now. It returns the new integer `conversation_id` in the response.
- Each turn: INSERT the visitor message (`sender_type='visitor'`, sender_name = visitor_name) and the bot reply (`sender_type='system'`, sender_name 'Kodie') into `chat_messages`; bump `chat_conversations.total_messages`/`visitor_messages` and set `last_message_at`. Wrap persistence in try/catch — a DB write failure must NOT break the chat reply (degrade: still answer, log to Sentry).
- Widget change (`Chatbot.astro`): stop relying solely on the client `conversationId` for server identity. After the first `kodie` response, store the returned integer `conversation_id` and send it on subsequent `kodie` and `ai-qualify` calls so all messages + the qualification attach to ONE server conversation. (Keep the client-side `chatHistory` for the model-context payload.)
- `ai-qualify.ts` already takes `conversation_id` and updates `chat_conversations.is_qualified` — ensure it now receives the DB integer id (from the widget) so leads tie to the real conversation row.

## 3. Knowledge from one source

- Create `src/lib/kodie-knowledge.ts` exporting: a `COMPANY` object (name, tagline, Ghana/fullstack positioning, contact email + phone, GHS-primary pricing bands with the ×12 USD, the service list) sourced from `SITE_CONFIG` where the field exists, plus a `buildSystemPrompt()` that renders the brand-voice + knowledge into the system-prompt string.
- `kodie.ts` imports `buildSystemPrompt()` instead of its inline hardcoded prompt. Knowledge reflects the current kente-era positioning (fullstack software studio, Ghana & Africa, GHS-primary pricing) and the real contact info. One place to edit; no drift.
- Static TS module (no admin editor — YAGNI). Pricing bands kept consistent with the site's currency standard.

## Out of scope

Claude/Anthropic upgrade (staying on free Llama 3.3); admin-editable knowledge base; streaming responses; moving qualification server-side (stays client-triggered, now rate-limited); removing the unused ANTHROPIC_API_KEY; D1-backed rate limiter; chat auth (stays public, now guarded).

## Error handling

- All new DB writes in `kodie.ts` are non-fatal (try/catch → Sentry) so the bot always answers.
- Rate-limit and length-cap responses are friendly 200s (no widget error state), except ai-qualify which silently falls back to rule-based.
- Gemini header change must preserve the existing fallback if the key is missing/call fails.

## Verification

- Gemini call carries `x-goog-api-key` header, NOT `?key=` (grep + a qualify run still classifies).
- Rate limit: scripted burst of >20 kodie calls/min from one IP → friendly throttle reply; ai-qualify burst → rule-based fallback (no Gemini call).
- >2000-char message → friendly shorten reply; long history → only last 20 messages sent to the model (assert via the payload built).
- Persistence: a dev chat creates one `chat_conversations` row + a `chat_messages` row per turn (visitor + system), visible via `/admin/chat`; the returned `conversation_id` is reused across turns; qualification attaches to that row.
- Knowledge: prompt built from `kodie-knowledge.ts`; bot answers pricing with GHS-primary figures.
- Manual deploy (Actions billing-locked) → production smoke green → a real chat exchange persists and reads back in `/admin/chat`.
