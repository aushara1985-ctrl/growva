# Revenue Engine 🚀

> Autonomous Revenue Layer for Internet Products  
> يختبر + يطلق + يقيس + يكرر — تلقائياً

---

## What it does

1. **Add your product** → name, description, target user
2. **Press "Start Growth Mode"** → AI generates 3 experiments
3. **Connect via webhook** → send real events from your product
4. **Daily loop runs automatically** → Kill weak, Scale winners, Generate new
5. **Revenue grows** without manual intervention

---

## Stack

- **Next.js 14** — Frontend + API
- **PostgreSQL** — Primary database (via Prisma)
- **OpenAI GPT-4o** — Experiment generation + Decision engine
- **Railway** — Hosting + Cron jobs

---

## Deploy on Railway

### 1. Create GitHub repo and push this code

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/revenue-engine.git
git push -u origin main
```

### 2. Railway setup

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Add **PostgreSQL** service to the same project
4. Railway auto-sets `DATABASE_URL`

### 3. Environment Variables (in Railway dashboard)

```
OPENAI_API_KEY=sk-...
CRON_SECRET=any_random_string_here
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
```

### 4. After deploy

Railway will auto-run: `npx prisma db push && npm start`

### 5. Set up Cron Job (in Railway)

- Schedule: `0 6 * * *` (daily at 6 AM)
- Command: `curl -X POST https://your-app.railway.app/api/cron/daily -H "x-cron-secret: YOUR_CRON_SECRET"`

---

## Connecting your products

Each product gets a unique API key. Send events via webhook:

```typescript
// From any product (Inab, Ventra, SeatX, etc.)
await fetch('https://your-engine.railway.app/api/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'PRODUCT_API_KEY', // from dashboard
  },
  body: JSON.stringify({
    type: 'PAGE_VIEW',    // PAGE_VIEW | CLICK | SIGNUP | PURCHASE
    experimentId: '...',  // optional - tracks per experiment
    value: 1,             // for PURCHASE: use actual amount
  }),
})
```

---

## Event Types

| Event | When to fire |
|-------|-------------|
| `PAGE_VIEW` | User visits landing page |
| `CLICK` | User clicks CTA |
| `SIGNUP` | User registers |
| `PURCHASE` | User pays (value = amount) |
| `CHURN` | User cancels |

---

## The Growth Loop (Daily)

Every day at 6 AM:

```
For each active product:
  1. Analyze all active experiments
  2. Calculate conversion rates
  3. AI decides: KILL / SCALE / ITERATE / CONTINUE
  4. Execute decisions automatically
  5. If no active experiments → generate 3 new ones
  6. Save daily report + summary
```

---

## Local Development

```bash
npm install
cp .env.example .env
# Fill in DATABASE_URL and OPENAI_API_KEY

npx prisma db push
npm run dev
```

Trigger growth loop manually (dev only):
```
GET http://localhost:3000/api/cron/daily
```
