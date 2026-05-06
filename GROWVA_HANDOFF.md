# GROWVA HANDOFF
_Last updated: 2026-05-06_

---

## LIVE URLS

| Resource | URL |
|---|---|
| Production app | https://growva-production.up.railway.app |
| GitHub repo | https://github.com/aushara1985-ctrl/growva |
| Railway project | https://railway.com/project/59ab71ab-fcdd-4dfe-a93a-ef9e2e0d2b2d |
| Railway service | service ID `14cb74b8-fde9-4939-b1f5-e2c7a2b8e5b1` |
| Railway env ID | `45324398-efcc-4b1b-8615-29a88127c93c` |

---

## WHAT WAS BUILT (COMPLETED)

### Security hardening
- GitHub webhook secret now **required** — returns 500 if `GITHUB_WEBHOOK_SECRET` is not set
- OpenAI client is lazy-initialized — build no longer throws if `OPENAI_API_KEY` is missing
- `/api/admin`, `/api/execution/approve`, `/api/execution/reject` protected by `ADMIN_SECRET` header
- TypeScript and ESLint build checks re-enabled (were silently suppressed)

### Landing page
- `src/app/page.tsx` replaced redirect-to-dashboard with a full landing page
- Dark theme, DM Sans font, hero / stats / how-it-works / features / CTA / footer

### Bug fixes (8 real bugs surfaced by re-enabling TS checks)
- `billing-executor.ts` — 4 wrong Prisma field names
- `brain.ts` — `WinningPattern.create` missing required `confidence` and `sampleSize`
- `executor.ts` — `suggestedImplementation` → `suggestedImpl`, `status: 'RUNNING'` → `'ACTIVE'`
- `feature-demand.ts` — same `suggestedImplementation` rename
- `monopoly-builder.ts` — 4 field name mismatches
- `monopoly.ts` — `PlaybookStep[]` cast to `Json` type
- `scheduler.ts` — type mismatch, broken destructuring, non-exported function call

### Phase 1: Schema (commit `0dfc77b`)
Added to `prisma/schema.prisma`:
- `RUNNING` value to `ExperimentStatus` enum
- `activatedAt DateTime?` on Experiment
- `reviewDueAt DateTime?` on Experiment
- `trackingId String? @unique` on Experiment
- `metadata Json?` on Product
- Changed `Experiment.status` default from `ACTIVE` → `PENDING`

### Phase 2: Activation API (commit `0dfc77b`)
`POST /api/experiments/{id}/activate`
- Accepts: experiment in `PENDING` or `ACTIVE` status
- Sets: `status = RUNNING`, `activatedAt = now`, `reviewDueAt = now + 48h`, `trackingId = UUID` (generated if not set)
- Returns: `{ id, status, trackingId, activatedAt, reviewDueAt }`
- Rejects: already-RUNNING → `409`, wrong status → `422`, not found → `404`

### Phase 3: Tracking link (commit `b1e03dd`)
`GET /api/track/{trackingId}`
- Finds experiment by `trackingId`
- Records a `CLICK` event with `{ referrer, source (utm_source), userAgent }` in metadata
- Redirects to `product.url` if set, otherwise falls back to `/products/{productId}` — no crash
- Returns `404` only if `trackingId` not found

### Scheduler + product route consistency (commit `cc1e323`)
- Experiments created by "Start Growth" and daily scheduler now default to `PENDING` (not `ACTIVE`)
- Scheduler processes both `RUNNING` (new) and `ACTIVE` (legacy rows) experiments
- Prevents auto-running experiments that the founder hasn't reviewed

### DB migration
- `prisma db push` run manually against Railway prod DB on 2026-05-06
- Schema is in sync — next deploy runs `prisma db push` in start script as a no-op

---

## CURRENT PRODUCTION STATE

| What | State |
|---|---|
| Latest commit on `main` | `b1e03dd` |
| Latest deployed commit | `b1e03dd` (deployment `fb7ba0eb`, SUCCESS) |
| DB schema | In sync with schema.prisma |
| Landing page | Live at `/` |
| `/api/experiments/{id}/activate` | Live, tested, working |
| `/api/track/{trackingId}` | Live, tested, working |
| Experiment generation (`POST /api/products/{id}`) | Broken — see blocker below |
| Daily scheduler | Running but producing no useful output until OPENAI_API_KEY is fixed |

### Test data in production DB
- Product ID: `cmou4bk1n00002qf74vxhvgap` (name: "Growva", url: `https://growva-production.up.railway.app`)
- Experiment ID: `cmou4s9b60001bfxb9sxvy7i6` (status: RUNNING, trackingId: `03e506a9-de1a-43f1-af52-53a69d47a348`)
- 1 CLICK event recorded on that experiment

---

## BLOCKERS

### BLOCKER 1 — `OPENAI_API_KEY` is wrong on Railway
**Symptom:** `POST /api/products/{id}` (Start Growth) returns 500.
**Root cause:** Railway env var `OPENAI_API_KEY` is set to the literal string `"placeholder"`.
**Fix:** Railway dashboard → your service → Variables → set `OPENAI_API_KEY` to your real key.
**Impact:** Experiment generation broken. Decisions broken. Daily brief broken.

### BLOCKER 2 — Railway tokens not usable with CLI
**Symptom:** `railway whoami` returns Unauthorized with both tokens provided.
**Root cause:** Tokens are project-level tokens. Railway CLI requires an account-level token.
**Workaround:** Railway GraphQL API works with project token for `deploymentLogs`, `serviceInstanceRedeploy` queries. Use that for automation.
**Fix if needed:** Railway dashboard → Account Settings → Tokens → create account token.

---

## RAILWAY OPERATIONS REFERENCE

```bash
# Trigger a redeploy (no CLI needed — uses GraphQL API)
curl -X POST https://backboard.railway.app/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 3b07bab2-ed82-48f1-b18f-ce254c265b76" \
  -d '{"query":"mutation { serviceInstanceRedeploy(environmentId: \"45324398-efcc-4b1b-8615-29a88127c93c\", serviceId: \"14cb74b8-fde9-4939-b1f5-e2c7a2b8e5b1\") }"}'

# Run DB migration from local (use public URL)
DATABASE_URL="postgresql://postgres:<password>@roundhouse.proxy.rlwy.net:18694/railway" \
  npx prisma db push

# Get deployment logs
curl -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer 3b07bab2-ed82-48f1-b18f-ce254c265b76" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ deploymentLogs(deploymentId: \"<id>\") { timestamp message severity } }"}'

# List recent deployments
curl -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer 3b07bab2-ed82-48f1-b18f-ce254c265b76" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ deployments(input: { serviceId: \"14cb74b8-fde9-4939-b1f5-e2c7a2b8e5b1\" }) { edges { node { id status createdAt } } } }"}'
```

---

## PHASE 4–7 (APPROVED BUT NOT STARTED)

These are the next coding tasks, in order. Do not start until user approves after reviewing handoff.

### Phase 4: Dashboard states
Show contextual messages based on product state — no UI rebuild, just conditional rendering.

| Product state | Message shown |
|---|---|
| No experiments | "Step 1: Click Start Growth to generate your first 3 experiments" |
| Has PENDING experiments | "Step 2: Review your experiments and activate the ones you want to run" |
| Has RUNNING experiments, no events | "Step 3: Your tracking link is ready — share it and wait for results" |
| Has events, no decision | "Results are in — click Get Decision to see what Growva recommends" |
| Has decision | Show decision prominently with next action |

Files: `src/app/dashboard/page.tsx`

### Phase 5: Product detail — activation button + tracking link
On each experiment card (in `/products/{id}`):
- PENDING → show "Activate" button → calls `POST /api/experiments/{id}/activate`
- RUNNING → show tracking link (`/api/track/{trackingId}`), copy button, `reviewDueAt` countdown
- Add manual result entry fallback: simple form writing pageViews / clicks / signups directly as Events

Files: `src/app/products/[id]/page.tsx`, possibly `src/app/api/events/manual/route.ts`

### Phase 6: Integration-ready onboarding
Show on first visit / no experiments. Three paths:
1. "I'll enter results manually" — skips integration, goes to Step 2
2. "Connect Google Analytics / Plausible" — shows API key + docs link
3. "Copy my tracking link" — shows `/api/track/{trackingId}` immediately after activation

No third-party SDKs. No new dependencies.

Files: new component or inline in `src/app/dashboard/page.tsx`

### Phase 7: Decision gate on `reviewDueAt`
After a RUNNING experiment passes `reviewDueAt`:
- Dashboard surfaces "Ready for Decision" badge on that experiment
- Proactively shows "Get Decision" CTA without requiring navigation to product detail
- Scheduler: after `reviewDueAt` passes, if no decision exists → flag as `decision_ready` in response

Files: `src/app/api/dashboard/route.ts`, `src/app/dashboard/page.tsx`

---

## WHAT NOT TO BUILD YET

- Builder Agent / GitHub issue creation
- Execution approval queue
- Monopoly scoring
- Competitor signals
- Collective brain / cross-product patterns
- Stripe checkout changes
- Growth cards UI
- Segment benchmarks
- Admin panel changes

---

## IMPORTANT FILES

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Source of truth for DB schema |
| `src/lib/ai.ts` | OpenAI wrappers — experiment gen, decisions, briefs |
| `src/lib/brain.ts` | BrainMemory, debate engine, feedback loop |
| `src/lib/scheduler.ts` | Daily growth loop — runs in cron |
| `src/app/api/experiments/[id]/activate/route.ts` | Phase 2 — activation endpoint |
| `src/app/api/track/[trackingId]/route.ts` | Phase 3 — tracking link + CLICK event |
| `src/app/api/products/[id]/route.ts` | Start Growth → generates PENDING experiments |
| `src/app/api/decisions/route.ts` | Manual "DECIDE NOW" trigger |
| `src/app/api/dashboard/route.ts` | Dashboard data aggregation |
| `src/app/dashboard/page.tsx` | Main dashboard UI |
| `GROWVA_CODE_ALIGNMENT_AUDIT.md` | Full product audit vs vision (2026-05-06) |
