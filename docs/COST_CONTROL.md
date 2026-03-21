# Cost Control Guide

## Monthly Cost Estimate (2-user household, normal usage)

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Free tier | 0 EUR |
| Vercel | Hobby (free) | 0 EUR |
| OpenAI (AI off) | - | 0 EUR |
| OpenAI (AI on, 3 calls/day) | Pay-per-token | ~0.02 EUR |
| Domain (optional) | Any registrar | ~1 EUR/mo |
| **Total with AI on** | | **~0.02-1 EUR/mo** |
| **Total with AI off** | | **0 EUR/mo** |

Well under the 10 EUR/month target in all scenarios.

## AI Token Math

Default settings: 3 calls/day, 300 output tokens max.

- Input per call: ~80 tokens (compact key:value prompt format)
- Output per call: ~200 tokens (2-4 sentences)
- Total per call: ~280 tokens
- Per month: 3 x 280 x 30 = 25,200 tokens

gpt-4o-mini pricing (as of 2024):
- Input: .15 per 1M tokens
- Output: .60 per 1M tokens
- Monthly cost: ~.015 = ~0.014 EUR

Even at 10 calls/day: ~0.05 EUR/month.

## Assumptions Behind These Numbers

- 2 users, one household
- AI summary triggered manually (not scheduled)
- Quick-add deterministic parser handles ~90% of inputs without AI
- No background polling or scheduled AI jobs
- Supabase free tier not exceeded (500MB DB, 2GB bandwidth)
- Vercel Hobby plan not exceeded (100GB bandwidth, 10s function timeout)

## What Could Push Costs Up

1. Raising AI_MAX_CALLS_PER_DAY above 10 - still cheap but worth knowing
2. Enabling scheduled summaries - adds ~30 calls/month automatically
3. Moving to Supabase Pro (/mo) - only needed if free tier pauses annoy you
4. Moving to a paid VPS for Docker - Hetzner CX11 is ~4 EUR/mo

## Free Tier Risks

### Supabase
- Projects pause after 7 days of inactivity on free tier
- Fix: set up a daily HTTP ping via cron-job.org (free) to your app URL
- The ping just needs to hit any public route (e.g. /login)

### Vercel Hobby
- 100GB bandwidth/month - a household app will use <1GB
- 10s serverless timeout - all API routes complete in <2s
- No risk of exceeding limits with 2 users

### OpenAI
- No free tier - pay per token from first call
- With AI_ENABLED=false (default when key is missing): zero cost
- Set up a spending limit in your OpenAI account as a safety net

## Cost Controls Built Into the App

1. AI_ENABLED defaults to false when OPENAI_API_KEY is not set
2. AI_MAX_CALLS_PER_DAY hard limit enforced server-side (default 3)
3. OPENAI_MAX_TOKENS caps output length (default 300)
4. Deterministic parser runs before AI - most inputs never reach OpenAI
5. AI usage logged in ai_usage_logs table - visible in Settings > AI Usage
6. Prompts use compact key:value format to minimise input tokens
7. Static system prompts benefit from OpenAI prompt caching (50% discount)

## Recommended Settings for Zero Surprise Bills

In .env.local:
  AI_ENABLED=false          # Start with AI off
  AI_MAX_CALLS_PER_DAY=3    # Enable when ready, keep at 3
  OPENAI_MAX_TOKENS=300     # Never raise above 400

In your OpenAI account:
  Set a monthly spending limit of  as a hard cap.
