# Kodie Chatbot Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the live AI chatbot — move the Gemini key out of the URL, add abuse/cost guards, actually persist conversations to D1, and source the bot's knowledge from one module.

**Architecture:** Two public endpoints (`kodie.ts` chat, `ai-qualify.ts` lead scoring) get the existing `rate-limit.ts` applied (friendly degraded responses, not hard 429s for the chat). `kodie.ts` is reworked to create a `chat_conversations` row on first message and persist both visitor + bot messages (non-fatal), returning the integer `conversation_id`; the widget reuses that id across turns and qualification. A new `src/lib/kodie-knowledge.ts` builds the system prompt from `SITE_CONFIG` + pricing constants.

**Tech Stack:** Astro 4 + Cloudflare (Workers AI Llama 3.3 free, D1, Gemini 2.5 Flash via REST), existing `src/utils/rate-limit.ts`, `SITE_CONFIG`.

**Spec:** `docs/superpowers/specs/2026-06-13-kodie-chatbot-hardening-design.md`

**Verified current state:**
- `kodie.ts`: whole POST in one try/catch (a DB error → 500, breaks chat). It ALREADY persists the BOT reply + updates counts IF a `conversation_id` is passed (lines 51-86), using `sender_type='operator', sender_name='Kodie'`. It does NOT save the visitor message and does NOT create a conversation. History is ALREADY capped via `history.slice(-10)` (line 150). System prompt hardcoded at lines 114-146. Model `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. No rate limit, no message-length cap.
- Widget generates a CLIENT-side `conversationId` string (`'chat-'+Date.now()+...`), sends it to `kodie` and `ai-qualify`. It does NOT create a DB conversation row, so the integer-keyed persistence never matches a real row.
- `ai-qualify.ts`: Gemini key in URL query (`?key=${GEMINI_API_KEY}`, ~line 116); has a rule-based fallback; reads `conversation_id`, updates `chat_conversations.is_qualified`.
- `rate-limit.ts`: `checkRateLimit(id, config) → {allowed, retryAfter, remaining}`, `getClientIdentifier(request)` (CF-Connecting-IP), `RATE_LIMITS` (LOGIN/API/PAYMENT). In-memory per-isolate.
- `chat_messages.sender_type` ∈ {visitor, operator, system}; bot uses `operator` (existing convention — keep it; `/admin/chat` renders operator as the studio side).
- DEPLOY: GitHub Actions billing-locked → MANUAL `wrangler pages deploy dist --project-name=ohwpstudios --branch=main` after building with prod PUBLIC_* env vars (GA `G-RDJ4N7W8GH`, beacon `9f29263b2d8441e18851a67bf9e09039`, Sentry DSN). Migration 047 already applied; no new migration here.

**Testing note:** no test framework. Per-task: `npm run build` + dev-server checks. Final task: manual deploy + production smoke + a live chat exchange that reads back in `/admin/chat`.

---

### Task 1: Gemini key → header + rate-limit on ai-qualify

**Files:**
- Modify: `src/pages/api/chat/ai-qualify.ts`

- [ ] **Step 1: Move the Gemini key to a header**

Find the fetch (~line 116). Change the URL to drop `?key=...` and add the header:

```ts
const res = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify(/* existing body */),
  }
);
```

(Keep the existing request body and response handling. `x-goog-api-key` is Google's supported header auth — identical behavior, key no longer in the URL.)

- [ ] **Step 2: Rate-limit — degrade to the rule-based fallback on limit**

At the top of the handler (after reading the request), add:

```ts
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '../../../utils/rate-limit';
// ...
const rl = await checkRateLimit('chat-qualify:' + getClientIdentifier(request), RATE_LIMITS.CHAT);
```

(RATE_LIMITS.CHAT is added in Task 2 — if doing Task 1 first, add the CHAT config to rate-limit.ts now; see Task 2 Step 1 for the exact block.) When `!rl.allowed`, SKIP the Gemini call and use the existing rule-based fallback path (the function the file already calls when the key is missing/fails) so no paid call is made and the widget still gets a qualification result. Read the file to find that fallback function name and route to it on the limited branch.

- [ ] **Step 3: Verify + commit**

`npm run build` → exit 0. Grep the file: zero `?key=` / `key=${`; one `x-goog-api-key`. Dev (no Gemini key locally → already uses fallback): POST a qualify request → 200 with a rule-based result; burst > limit → still 200 rule-based (no error).

```powershell
git add src/pages/api/chat/ai-qualify.ts src/utils/rate-limit.ts
git commit -m "fix(chat): Gemini key to header; rate-limit qualify to rule-based fallback"
```

---

### Task 2: Rate-limit + message-length cap on kodie

**Files:**
- Modify: `src/utils/rate-limit.ts` (add CHAT config)
- Modify: `src/pages/api/chat/kodie.ts` (guards)

- [ ] **Step 1: Add the CHAT rate config**

In `src/utils/rate-limit.ts`, add to `RATE_LIMITS`:

```ts
  CHAT: {
    maxAttempts: 20,          // 20 messages
    windowMs: 60 * 1000,      // per minute
    blockDurationMs: 2 * 60 * 1000 // soft-block 2 minutes
  },
```

- [ ] **Step 2: Guard kodie's POST (friendly 200 responses, not hard errors)**

In `kodie.ts` POST, after parsing `{ message, ... }` and the `if (!message)` check, add imports at top and guards:

```ts
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '../../../utils/rate-limit';

const friendly = (text: string) =>
  new Response(JSON.stringify({ success: true, response: { message: text, escalate: false, confidence: 1 } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } });

// rate limit — keep the widget UX intact with a friendly reply, no error state
const rl = await checkRateLimit('chat-kodie:' + getClientIdentifier(request), RATE_LIMITS.CHAT);
if (!rl.allowed) {
  return friendly("You're sending messages quickly — give me a few seconds to keep up, then try again. 🙂");
}

// message-length cap
if (typeof message === 'string' && message.length > 2000) {
  return friendly('That message is quite long! Could you shorten it a little so I can help more accurately?');
}
```

(History is already capped via `history.slice(-10)` in `callWorkersAI` — no change. Leave it.)

- [ ] **Step 3: Verify + commit**

`npm run build` → exit 0. Dev: POST a normal message → 200 AI reply; POST a 2500-char message → 200 friendly "shorten" reply; burst > 20/min from one IP → 200 friendly "slow down" reply.

```powershell
git add src/utils/rate-limit.ts src/pages/api/chat/kodie.ts
git commit -m "feat(chat): rate-limit + message-length cap on kodie (friendly degrade)"
```

---

### Task 3: Persist conversations server-side in kodie

**Files:**
- Modify: `src/pages/api/chat/kodie.ts`

- [ ] **Step 1: Create the conversation on first message; persist visitor + bot; non-fatal; return id**

Rework the persistence so the bot ALWAYS answers even if DB writes fail, the conversation is created when there's no valid integer id, and the visitor message is saved too. Replace the persistence block (current lines ~42-86) with this shape (adapt to the file; `getKodieResponse` call stays):

```ts
const data = await request.json();
const { message, conversation_history } = data;
let conversationId: number | null = Number.isInteger(data.conversation_id) ? data.conversation_id : null;
const visitorName = (data.userName || data.visitor_name || 'Visitor').toString().slice(0, 120);
const visitorEmail = (data.userEmail || data.visitor_email || '').toString().slice(0, 200);
const ip = getClientIdentifier(request);
const ua = request.headers.get('user-agent') || 'unknown';

// ...message + rate-limit + length guards from Task 2...

const kodieResponse = await getKodieResponse(message, conversation_history || [], AI);

// Persistence is best-effort — a DB failure must never break the reply.
try {
  if (conversationId === null) {
    const created = await db.prepare(
      "INSERT INTO chat_conversations (visitor_name, visitor_email, visitor_ip, visitor_user_agent, status, source, started_at, last_message_at, total_messages, visitor_messages, operator_messages) VALUES (?, ?, ?, ?, 'active', 'chatbot', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 0)"
    ).bind(visitorName, visitorEmail || null, ip, ua).run();
    conversationId = Number(created.meta.last_row_id);
  }

  // visitor message
  await db.prepare(
    "INSERT INTO chat_messages (conversation_id, message_text, message_type, sender_type, sender_name, sent_at) VALUES (?, ?, 'text', 'visitor', ?, CURRENT_TIMESTAMP)"
  ).bind(conversationId, message, visitorName).run();

  // bot reply
  await db.prepare(
    "INSERT INTO chat_messages (conversation_id, message_text, message_type, sender_type, sender_name, sent_at) VALUES (?, ?, 'text', 'operator', 'Kodie', CURRENT_TIMESTAMP)"
  ).bind(conversationId, kodieResponse.message).run();

  await db.prepare(
    "UPDATE chat_conversations SET total_messages = total_messages + 2, visitor_messages = visitor_messages + 1, operator_messages = operator_messages + 1, last_message_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(conversationId).run();

  if (kodieResponse.escalate) {
    await db.prepare("UPDATE chat_conversations SET status = 'pending', priority = 'high' WHERE id = ?").bind(conversationId).run();
    await db.prepare(
      "INSERT INTO chat_messages (conversation_id, message_text, message_type, sender_type, sender_name, sent_at) VALUES (?, ?, 'text', 'system', 'System', CURRENT_TIMESTAMP)"
    ).bind(conversationId, '🔔 This conversation has been escalated to our support team. A human agent will be with you shortly!').run();
    await db.prepare("UPDATE chat_conversations SET total_messages = total_messages + 1 WHERE id = ?").bind(conversationId).run();
  }
} catch (e) {
  console.error('chat persistence failed (non-fatal):', e);
}

return new Response(JSON.stringify({ success: true, conversation_id: conversationId, response: kodieResponse }), {
  status: 200, headers: { 'Content-Type': 'application/json' },
});
```

Note: `getClientIdentifier` is already imported (Task 2). If `db` is missing, the spec says still answer — relax the early `if (!db) 500` to: if no `db`, skip persistence and still return the AI reply (move the AI call before the db guard, or make the db-missing path return the reply with `conversation_id: null`). Implement so a missing DB never blocks a reply.

- [ ] **Step 2: Verify + commit**

`npm run build` → exit 0. Dev (local D1): POST a first message with `{message, userName, userEmail}` and NO conversation_id → response includes an integer `conversation_id`; `SELECT * FROM chat_conversations` shows 1 active row; `chat_messages` has a visitor row + an operator 'Kodie' row. POST a second message WITH that `conversation_id` → 2 more messages on the SAME conversation, counts updated. Escalation keyword → status 'pending' + system message. Simulate a DB error (bad SQL temporarily) → the reply still returns (persistence non-fatal).

```powershell
git add src/pages/api/chat/kodie.ts
git commit -m "feat(chat): persist conversations + visitor messages; return conversation_id; non-fatal"
```

---

### Task 4: Widget wires the server conversation_id

**Files:**
- Modify: `src/components/Chatbot.astro` (client script: message send ~1335, qualify ~1364)

- [ ] **Step 1: Track and reuse the server conversation id**

In the widget script, add a `let serverConversationId = null;` near the other state. In the `kodie` fetch success handler, capture it:

```js
const data = await response.json();
if (data.conversation_id) serverConversationId = data.conversation_id;
```

Send it on subsequent `kodie` calls: include `conversation_id: serverConversationId` in the POST body (null on the first call is fine — the server creates one). In the `ai-qualify` fetch (~line 1364), send `conversation_id: serverConversationId` (the integer) instead of the client-side `conversationId` string, so the qualification attaches to the real conversation row. Keep the client-side `chatHistory` for the model-context payload (`conversation_history`).

- [ ] **Step 2: Verify + commit**

`npm run build` → exit 0. Dev (Playwright or manual): open the widget, send 2 messages → both persist to ONE `chat_conversations` row (check local D1); after 3 messages the qualify call carries the integer id and `chat_conversations.is_qualified` updates on that row. Confirm the widget still shows replies normally.

```powershell
git add src/components/Chatbot.astro
git commit -m "feat(chat): widget reuses the server conversation_id across turns + qualification"
```

---

### Task 5: Centralize knowledge into one module

**Files:**
- Create: `src/lib/kodie-knowledge.ts`
- Modify: `src/pages/api/chat/kodie.ts` (use `buildSystemPrompt()`)

- [ ] **Step 1: Create `src/lib/kodie-knowledge.ts`**

```ts
import { SITE_CONFIG } from '../config';

/** Single source of truth for what Kodie knows about OhWP Studios. */
export const COMPANY = {
  name: SITE_CONFIG.name,
  positioning: 'a fullstack software development studio based in Ghana, building web apps, SaaS, APIs, and AI-powered products for organisations across Ghana and Africa',
  email: SITE_CONFIG.email,
  phone: '+233505982361',
  services: [
    'Fullstack web & app development (React, Next.js, Node.js, TypeScript, Python)',
    'SaaS & custom software',
    'API development & integrations',
    'UI/UX design',
    'E-commerce',
    'SEO & growth',
    'AI-powered features',
  ],
  // GHS-primary per the site currency standard (1 USD = 12 GH₵)
  pricing: [
    'Basic websites: GH₵60,000 – GH₵180,000 ($5,000 – $15,000)',
    'Custom web apps: GH₵180,000 – GH₵600,000+ ($15,000 – $50,000+)',
    'Mobile apps: GH₵300,000 – GH₵1,200,000+ ($25,000 – $100,000+)',
    'Design projects: GH₵36,000 – GH₵240,000 ($3,000 – $20,000)',
  ],
};

export function buildSystemPrompt(): string {
  return `You are Kodie, the friendly AI assistant for ${COMPANY.name} — ${COMPANY.positioning}.

Services:
${COMPANY.services.map((s) => `- ${s}`).join('\n')}

Personality: warm, professional, proudly Ghanaian, clear about technical topics without jargon, honest when unsure, proactive about next steps (a free consultation or a project scope).

Guidelines:
1. Answer technical and project questions helpfully (2-4 short paragraphs).
2. Always quote prices in Ghana Cedis first with the USD equivalent in brackets.
3. Offer the free AI project estimator (/estimate-project) or a consultation (/booking) when the visitor shows buying intent.
4. If something needs a human, offer to connect them — but try to help first.
5. Occasional emojis are welcome; keep it natural.

Pricing guidance (ranges depend on scope):
${COMPANY.pricing.map((p) => `- ${p}`).join('\n')}

Contact: ${COMPANY.email} | ${COMPANY.phone}

Respond to the user's message helpfully and professionally.`;
}
```

(Verify `SITE_CONFIG` exposes `name` and `email` — read `src/config.ts`; if the email field has a different name, adapt. If `SITE_CONFIG.email` is absent, hardcode `ohwpstudios@gmail.com` and note it.)

- [ ] **Step 2: Use it in `kodie.ts`**

Replace the inline `const systemPrompt = \`...\`` (lines ~114-146) with:

```ts
import { buildSystemPrompt } from '../../../lib/kodie-knowledge';
// ...inside callWorkersAI:
const systemPrompt = buildSystemPrompt();
```

Delete the now-dead hardcoded prompt string.

- [ ] **Step 3: Verify + commit**

`npm run build` → exit 0. Dev: a pricing question still returns GHS-primary figures (now from the module). Grep `kodie.ts`: the long hardcoded prompt is gone; `buildSystemPrompt` imported.

```powershell
git add src/lib/kodie-knowledge.ts src/pages/api/chat/kodie.ts
git commit -m "feat(chat): single-source Kodie knowledge from config; kente-era positioning"
```

---

### Task 6: Verification + manual deploy + gate (MANUAL)

**Files:** none (process)

- [ ] **Step 1: Local battery**

`npm run build` → exit 0. Dev server end-to-end: a full chat (3+ messages) creates one conversation, persists every turn, qualification ties to it; rate-limit burst → friendly degrade; 2500-char message → shorten reply; ai-qualify uses the header (grep confirms no `?key=`); knowledge answers GHS-primary.

- [ ] **Step 2: Manual production deploy** (GitHub Actions billing-locked — replicate CI)

```powershell
$env:PUBLIC_GA_ID="G-RDJ4N7W8GH"; $env:PUBLIC_CF_BEACON_TOKEN="9f29263b2d8441e18851a67bf9e09039"
$env:PUBLIC_SENTRY_DSN="https://8cf93b70faa7954afe0c228987a2382a@o4511547761360896.ingest.de.sentry.io/4511547781677136"
$env:PUBLIC_COMMIT_SHA=(git rev-parse HEAD)
npm run build
$env:CLOUDFLARE_ACCOUNT_ID="ea2eb3a9813660dfca2a60e594858538"
# preview first
npx wrangler pages deploy dist --project-name=ohwpstudios --branch=cv-preview --commit-dirty=true
```

(No migration this cycle.) On the preview, send a chat message → it replies (Workers AI is on the AI binding, available in preview) — note: persistence writes to the SHARED prod D1, so a preview chat creates a real conversation row; use an obvious test name and delete the test conversation rows after, OR accept one test row. Verify rate-limit + length guards via curl bursts.

- [ ] **Step 3: USER GATE → production**

Present preview results. On approval, deploy to production branch:

```powershell
npx wrangler pages deploy dist --project-name=ohwpstudios --branch=main --commit-dirty=true
node scripts/smoke-test.mjs https://ohwpstudios.org   # all green (no chat-specific check, but nothing regresses)
```

Then a LIVE check: open ohwpstudios.org, chat with Kodie, confirm the exchange appears in `/admin/chat` (real persistence). Clean up any test conversation rows. Update memory.

## Done means

- Gemini key never in a URL (header only).
- Public chat endpoints rate-limited + length-capped, degrading to friendly replies, not breaking the widget.
- Every Kodie conversation is one `chat_conversations` row with all messages persisted (visitor + bot), visible in `/admin/chat`; qualification attaches to it.
- The bot's knowledge comes from `src/lib/kodie-knowledge.ts` (GHS-primary, Ghana-fullstack positioning) — no drift.
- Deployed manually (Actions billing-locked); production smoke green; a live chat reads back in admin.
