# Business Requirements Document
## Family Assistant AI — Technical Reference

**Version:** 1.0  
**Date:** April 2026  
**Status:** Production  

---

## 1. Overview

Family Assistant AI is a shared household management Progressive Web App (PWA) built for two users (a couple). It manages chores, reminders, grocery lists, events, meal planning, and delivers AI-powered daily summaries via push notification. The entire stack runs on free/hobby tiers with a hard cost ceiling of 10 EUR/month.

---

## 2. Hosting & Infrastructure

### 2.1 Frontend — Vercel

| Property | Value |
|---|---|
| Platform | [Vercel](https://vercel.com) |
| Plan | Hobby (free) |
| Framework | Next.js 14 (App Router) |
| Region | Auto (edge-optimized) |
| Deploy trigger | Git push to `main` branch |
| Build command | `npm run build` |
| Output | Static + serverless functions |
| Function timeout | 10 seconds (Hobby limit) |
| Bandwidth | 100 GB/month (Hobby limit) |
| Custom domain | Configurable via Vercel dashboard |

Vercel auto-deploys on every push to `main`. No manual deploy step required.

### 2.2 Database & Auth — Supabase

| Property | Value |
|---|---|
| Platform | [Supabase](https://supabase.com) |
| Plan | Free tier |
| Database | PostgreSQL 15 |
| Auth | Supabase Auth (email/password) |
| Storage | Not used |
| Realtime | Not used |
| DB size limit | 500 MB (free tier) |
| Bandwidth limit | 2 GB/month (free tier) |
| Inactivity pause | Projects pause after 7 days of no activity |

> Free tier note: Set up a daily ping via [cron-job.org](https://cron-job.org) pointing at `GET /api/health` to prevent Supabase from pausing the project.

### 2.3 AI — OpenAI

| Property | Value |
|---|---|
| Provider | [OpenAI](https://platform.openai.com) |
| Model | `gpt-4o-mini` |
| Usage | Optional — app is fully functional without it |
| Rate limit | Configurable per household (default: 3 calls/day) |
| Max tokens per call | 300 (configurable) |
| Estimated cost | ~0.02–0.10 EUR/month at default settings |
| Kill switch | `AI_ENABLED=false` env var disables all AI calls |

### 2.4 Push Notifications — Web Push (VAPID)

| Property | Value |
|---|---|
| Protocol | Web Push (RFC 8030) |
| Library | `web-push` v3.6.7 |
| Key type | VAPID (Voluntary Application Server Identification) |
| Delivery | Browser push service (Apple APNs for iOS, FCM for Android/Chrome) |
| iOS requirement | iOS 16.4+, app added to Home Screen via Safari |
| Storage | `push_subscriptions` table in Supabase |

### 2.5 Source Control

| Property | Value |
|---|---|
| Platform | GitHub |
| Branch strategy | Single `main` branch, direct push |
| CI/CD | Vercel GitHub integration (auto-deploy on push) |

---

## 3. Tech Stack

### 3.1 Runtime

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 14.2.35 |
| Language | TypeScript | 5.5.x |
| Runtime | Node.js | 20.x |
| React | React | 18.3.x |

### 3.2 Frontend Libraries

| Library | Version | Purpose |
|---|---|---|
| `tailwindcss` | 3.4.x | Utility-first CSS |
| `lucide-react` | 0.414.x | Icon set |
| `@radix-ui/*` | 1.x–2.x | Accessible UI primitives (dialog, checkbox, select, toast) |
| `react-hook-form` | 7.52.x | Form state management |
| `@hookform/resolvers` | 3.9.x | Zod integration for forms |
| `zod` | 3.23.x | Schema validation |
| `date-fns` | 3.6.x | Date formatting and arithmetic |
| `clsx` + `tailwind-merge` | latest | Conditional class merging |
| `@tanstack/react-query` | 5.51.x | Server state / data fetching |
| `next-pwa` | 5.6.x | PWA manifest injection (SW generation disabled) |

### 3.3 Backend / API Libraries

| Library | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | 2.44.x | Supabase client |
| `@supabase/ssr` | 0.4.x | Server-side Supabase with cookie auth |
| `openai` | 4.53.x | OpenAI API client |
| `web-push` | 3.6.7 | VAPID push notification dispatch |

### 3.4 Dev / Test

| Tool | Version | Purpose |
|---|---|---|
| `vitest` | 2.0.x | Unit test runner |
| `@testing-library/react` | 16.x | Component testing |
| `eslint` + `eslint-config-next` | 8.x / 14.x | Linting |

---

## 4. Application Architecture

```
Browser / iPhone PWA
        │
        ▼
   Vercel Edge (Next.js 14 App Router)
        │
        ├── /app/(auth)/*          → Login, Signup pages (server components)
        ├── /app/(app)/*           → Protected app pages (server components)
        ├── /app/api/*             → API Route Handlers (serverless functions)
        │       ├── /api/household/create
        │       ├── /api/household/invite
        │       ├── /api/quick-add
        │       ├── /api/quick-add/save
        │       ├── /api/ai/summary
        │       ├── /api/notifications/summary
        │       ├── /api/notifications/bell
        │       ├── /api/push/subscribe
        │       └── /api/push/send
        │
        ├── Middleware (src/middleware.ts)
        │       └── Session refresh + route protection
        │
        └── /public/sw.js          → Minimal service worker (push handler)
                │
                ▼
        Supabase (PostgreSQL + Auth)
                │
                └── OpenAI API (optional, server-side only)
```

### 4.1 Auth Flow

1. User signs up / logs in via Supabase Auth (email + password)
2. Supabase sets a session cookie (`sb-*`)
3. Next.js middleware (`src/middleware.ts`) refreshes the session on every request
4. Server components call `createClient()` which reads the cookie
5. API routes call `createClient()` for user-scoped queries, `createServiceClient()` for admin operations (invite join, push subscription save)
6. `household_id` is always derived server-side from `household_members` — never trusted from client

### 4.2 Household Model

- One household per pair of users
- Created by first user (owner role)
- Second user joins via 8-character invite code
- All data is scoped to `household_id`
- RLS policies enforce membership on every table

### 4.3 AI Flow

```
User triggers summary
        │
        ▼
POST /api/notifications/summary?type=morning|evening
        │
        ├── 1. Fetch household data (chores, events, reminders, meals, groceries)
        ├── 2. Build deterministic summary (always works, no AI needed)
        ├── 3. Check: AI enabled? User prefs allow AI summaries? Daily quota not exceeded?
        │       ├── YES → call OpenAI gpt-4o-mini, log to ai_usage_logs
        │       └── NO  → use deterministic summary
        ├── 4. Log to notification_delivery_log
        └── 5. POST /api/push/send → dispatch Web Push to all user devices
```

---

## 5. Database Schema

### Tables

| Table | Purpose |
|---|---|
| `profiles` | User profile (id = auth.users.id) |
| `households` | Household record with invite code |
| `household_members` | User ↔ household membership (owner / member) |
| `household_settings` | Per-household AI settings and limits |
| `chores` | Tasks with recurrence, assignee, priority, status |
| `chore_completions` | Completion history per chore |
| `reminders` | Time-based reminders with assignee |
| `grocery_items` | Shopping list items with category |
| `grocery_templates` | Reusable grocery item templates |
| `events` | Calendar events with recurrence support |
| `meals` | Reusable meal templates with ingredients |
| `meal_ingredients` | Ingredients linked to a meal template |
| `meal_plans` | Meal assigned to a specific date + slot |
| `notifications` | In-app notification records |
| `user_notification_prefs` | Per-user push schedule preferences |
| `notification_delivery_log` | History of sent summaries |
| `push_subscriptions` | Web Push endpoint + VAPID keys per device |
| `ai_usage_logs` | Per-call AI usage tracking (tokens, model, feature) |

### Migrations (run in order)

| File | Description |
|---|---|
| `001_initial_schema.sql` | Core tables: profiles, households, chores, reminders, groceries, events, AI logs |
| `002_rls_policies.sql` | Row Level Security policies for all tables |
| `003_profile_trigger.sql` | Auto-create profile on auth.users insert |
| `004_fix_rls_recursion.sql` | Fix infinite recursion in household_members SELECT policy |
| `005_family_os.sql` | Meals, meal plans, meal ingredients, notifications, visibility columns |
| `006_recurring_events_notifications.sql` | Event recurrence fields, user_notification_prefs, notification_delivery_log |
| `007_push_subscriptions.sql` | push_subscriptions table for Web Push |

### RLS Strategy

- All tables use Row Level Security
- `is_household_member(household_id)` helper function used in policies
- Private items (visibility = 'private') only visible to creator
- Shared items visible to all household members
- `push_subscriptions` uses `user_id = auth.uid()` — users only see their own devices
- Service role key used server-side for cross-user operations (invite join, push dispatch)

---

## 6. API Routes

All routes are Next.js Route Handlers under `src/app/api/`.

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/household/create` | Required | Create household, set owner role |
| POST | `/api/household/invite` | Required | Join household by invite code (uses service role) |
| POST | `/api/quick-add` | Required | Parse natural language input (deterministic + optional AI) |
| POST | `/api/quick-add/save` | Required | Save parsed quick-add item to correct table |
| POST | `/api/ai/summary` | Required | Generate AI summary on demand |
| POST | `/api/notifications/summary` | Required | Generate + push morning/evening summary |
| GET  | `/api/notifications/bell` | Required | Fetch recent notification delivery log |
| POST | `/api/push/subscribe` | Required | Save push subscription for current device |
| DELETE | `/api/push/subscribe` | Required | Remove push subscription |
| POST | `/api/push/send` | Required | Dispatch Web Push to user's devices |
| GET  | `/api/health` | None | Health check (used to keep Supabase alive) |

---

## 7. Environment Variables

### Required

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API → service_role key (never expose client-side) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL, e.g. `https://family-assistant.vercel.app` |
| `APP_URL` | Same as above (server-side usage) |

### Push Notifications (required for push to work)

| Variable | How to generate |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Run `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Same command as above |
| `VAPID_SUBJECT` | `mailto:you@example.com` |

### AI (optional — app works without these)

| Variable | Default | Notes |
|---|---|---|
| `AI_ENABLED` | `false` | Set to `true` to enable AI features |
| `OPENAI_API_KEY` | unset | Leave unset to disable AI entirely |
| `OPENAI_MODEL` | `gpt-4o-mini` | Cheapest model that works well |
| `OPENAI_MAX_TOKENS` | `300` | Max output tokens per call |
| `AI_MAX_CALLS_PER_DAY` | `3` | Per-household daily cap |

### Docker only

| Variable | Value |
|---|---|
| `DOCKER_BUILD` | `true` (set automatically by Dockerfile) |

---

## 8. Service Worker

The app uses a hand-crafted minimal service worker at `/public/sw.js`. It is committed to the repo and served as a static file by Vercel.

**Why not next-pwa generated SW:** next-pwa's workbox SW precaches all static assets during install. On Vercel, precache fetch failures cause the SW to go `redundant` immediately, breaking push notifications. Our SW has zero precaching.

**What it does:**
- `install` event: calls `self.skipWaiting()` — activates immediately
- `activate` event: calls `clients.claim()` — takes control of all pages
- `push` event: receives push payload, calls `showNotification()`
- `notificationclick` event: focuses existing window or opens new one at the notification URL

**Registration:** The `usePushNotifications` hook registers `/sw.js` manually via `navigator.serviceWorker.register("/sw.js")` when the user taps "Enable push notifications". It does not auto-register on page load.

---

## 9. PWA Configuration

| Property | Value |
|---|---|
| App name | Family Assistant AI |
| Short name | Family AI |
| Start URL | `/dashboard` |
| Display mode | `standalone` |
| Theme color | `#0ea5e9` (sky blue) |
| Background color | `#ffffff` |
| Orientation | Portrait |
| Icons | `/icons/icon-192.png`, `/icons/icon-512.png` |
| Manifest | `/public/manifest.json` |
| Apple Web App | Enabled via meta tags in `layout.tsx` |

**iPhone install:** Open app URL in Safari → Share → Add to Home Screen. Push notifications require iOS 16.4+ and the app must be launched from the Home Screen icon (not Safari).

---

## 10. Cost Breakdown

| Service | Plan | Monthly Cost |
|---|---|---|
| Vercel | Hobby | Free |
| Supabase | Free tier | Free |
| OpenAI | Pay-per-use | ~0.02–0.10 EUR (at 3 calls/day, gpt-4o-mini) |
| Domain (optional) | Any registrar | ~1 EUR/month |
| **Total** | | **< 1 EUR/month (no domain), < 2 EUR/month (with domain)** |

Hard ceiling: `AI_MAX_CALLS_PER_DAY=3` + `OPENAI_MAX_TOKENS=300` limits OpenAI spend to well under 10 EUR/month even if usage increases.

---

## 11. Security

- All `household_id` values are derived server-side from the authenticated session — never trusted from client request body
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) is server-only, never exposed to browser
- VAPID private key (`VAPID_PRIVATE_KEY`) is server-only
- RLS enforced on every table — direct DB access from client is safe
- Push subscription endpoints stored server-side, dispatched server-side only
- No file uploads, no user-generated media
- Auth: email/password only, no OAuth in current version

---

## 12. Local Development

```bash
git clone <repo-url>
cd household-ai
npm install
cp .env.example .env.local
# Fill in .env.local with Supabase credentials
npm run dev
# App runs at http://localhost:3000
```

Run migrations in Supabase SQL Editor in order (001 → 007).

Push notifications do not work in local dev (SW disabled in development, no HTTPS).

---

## 13. Docker

A `Dockerfile` and `docker-compose.yml` are included for self-hosted deployment.

```bash
cp .env.example .env.local
# Fill in values
docker compose up -d
# App runs at http://localhost:3000
```

The Docker build uses `output: "standalone"` in Next.js config (enabled via `DOCKER_BUILD=true` env var).

---

## 14. Testing

```bash
npm run test        # single run (vitest)
npm run test:watch  # watch mode
```

Test files are in `tests/`. Uses Vitest + Testing Library + jsdom.

---

## 15. Key File Locations

| Path | Description |
|---|---|
| `src/app/(app)/` | All protected app pages |
| `src/app/(auth)/` | Login and signup pages |
| `src/app/api/` | All API route handlers |
| `src/components/` | Shared UI components |
| `src/hooks/usePushNotifications.ts` | Push subscription hook |
| `src/lib/supabase/server.ts` | Server-side Supabase client factory |
| `src/lib/supabase/client.ts` | Browser-side Supabase client factory |
| `src/lib/adapters/ai.ts` | OpenAI adapter with rate limiting |
| `src/lib/prompts.ts` | AI prompt builders |
| `public/sw.js` | Service worker (push handler) |
| `public/manifest.json` | PWA manifest |
| `supabase/migrations/` | All DB migrations (001–007) |
| `docs/` | Deploy guides and this BRD |
