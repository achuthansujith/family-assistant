# Architecture

Next.js 14 App Router + Supabase + OpenAI

Security: All DB access via Supabase RLS policies.
AI: Rate-limited, logged, with deterministic fallback.
PWA: next-pwa service worker, installable on iPhone via Safari.

Adapters in src/lib/adapters/ allow swapping AI/DB providers later.
Types in src/types/index.ts are reusable for future React Native migration.
