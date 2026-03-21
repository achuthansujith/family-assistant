# HomeBase - Household AI Assistant

A shared household assistant PWA for two users. Manage chores, reminders, groceries, events, and get AI-powered daily summaries. Designed to run under 10 EUR/month on free tiers.

## What it does

- Dashboard with today view, overdue items, upcoming events
- Chores with recurrence rules, assignees, and completion history
- Reminders for self or partner with due times
- Grocery list with natural language quick-add
- Events calendar with categories
- Weekly planner view (7-day overview)
- AI daily summary - manually triggered, rate-limited, fully optional
- Invite-based household sharing for exactly 2 users

## Architecture

Next.js 14 App Router + TypeScript, Supabase (Postgres + Auth + RLS), OpenAI gpt-4o-mini (optional), Tailwind CSS, Zod validation, PWA via next-pwa.

All AI calls are server-side only, rate-limited per household, logged to DB, and have a deterministic fallback. The app is fully functional with AI_ENABLED=false.

## Assumptions

- Exactly 2 users per household (MVP constraint)
- Supabase free tier is sufficient (500MB DB, 2GB bandwidth)
- Vercel Hobby plan is sufficient (no always-on server needed)
- iPhone users install via Safari > Add to Home Screen (no App Store)
- Email/password auth only (no OAuth providers in MVP)
- No file uploads or image storage
- No real-time push notifications in MVP (in-app state only)
- Supabase free tier pauses after 7 days of inactivity - see Free Tier Notes

## Local Setup

1. git clone and cd into household-ai
2. npm install
3. cp .env.example .env.local and fill in values
4. Run Supabase migrations (see below)
5. npm run dev

## Supabase Setup

1. Create a free project at https://supabase.com
2. Run migrations in SQL Editor in order:
   - supabase/migrations/001_initial_schema.sql
   - supabase/migrations/002_rls_policies.sql
   - supabase/migrations/003_profile_trigger.sql
3. Copy Project URL, anon key, service_role key to .env.local
4. Enable Email auth in Authentication > Providers
5. Set Site URL in Authentication > URL Configuration to your deployed URL

## Environment Variables

See .env.example - every variable is documented inline.

Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL, APP_URL

Optional AI: OPENAI_API_KEY (leave unset to disable AI), AI_ENABLED, AI_MAX_CALLS_PER_DAY (default 3), OPENAI_MAX_TOKENS (default 300), OPENAI_MODEL (default gpt-4o-mini)

## Disable AI

AI is disabled by default if OPENAI_API_KEY is not set. Set AI_ENABLED=false to be explicit.

With AI disabled: quick-add uses deterministic parser, daily summary uses structured DB data, all features work, zero OpenAI cost.

## Free Tier Notes

Supabase free tier pauses projects after 7 days of inactivity. Options:
- Set up a free daily ping via cron-job.org pointing at your app URL
- Accept the pause and unpause manually via Supabase dashboard
- Upgrade to Supabase Pro if this becomes annoying

Vercel Hobby: 100GB bandwidth/month, 10s function timeout - both fine for 2 users.

## Deploy

See docs/DEPLOY_VERCEL.md, docs/DEPLOY_NETLIFY.md, docs/DEPLOY_CLOUDFLARE.md, docs/DEPLOY_DOCKER.md

## iPhone PWA

Open deployed URL in Safari > Share > Add to Home Screen. Web push not implemented in MVP.

## Running Tests

npm run test

## Roadmap to Native iOS

Supabase backend stays identical. Replace Next.js with React Native/Expo. Reuse src/types/index.ts and src/lib/validators/schemas.ts. Replace API routes with Supabase Edge Functions.
