# Deploy to Cloudflare Pages

Cloudflare Pages requires an adapter because Next.js SSR does not run natively on Workers.

## Option A: OpenNext Cloudflare Adapter (recommended)

1. Install the adapter:
   npm install -D @opennextjs/cloudflare wrangler

2. Create wrangler.toml in project root:
   name = "homebase"
   compatibility_date = "2024-09-23"
   compatibility_flags = ["nodejs_compat"]
   pages_build_output_dir = ".open-next/assets"

3. Update package.json build script:
   "build:cf": "opennextjs-cloudflare"

4. Set secrets via Cloudflare dashboard or wrangler CLI:
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   wrangler secret put OPENAI_API_KEY

5. Set public env vars in Cloudflare Pages > Settings > Environment variables:
   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL

6. Deploy:
   npx wrangler pages deploy

## Option B: Static export + Supabase Edge Functions

Use this if you want zero Workers cost and are comfortable moving API logic.

1. Uncomment output: 'export' in next.config.js
2. Move /api/ai/summary and /api/quick-add to Supabase Edge Functions
3. Build: npm run build (outputs to /out)
4. Deploy /out to Cloudflare Pages via dashboard or wrangler

## Notes
- Cloudflare Pages free tier: unlimited requests, 500 builds/month
- Workers free tier: 100,000 requests/day - more than enough for 2 users
- Option A is simpler but requires Workers. Option B is pure static.
