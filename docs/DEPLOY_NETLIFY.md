# Deploy to Netlify

## Prerequisites
- Netlify account (free Starter plan)
- Supabase project set up with migrations run
- Code pushed to GitHub

## Steps

1. Go to https://app.netlify.com and click Add new site > Import an existing project

2. Connect your GitHub repo

3. Build settings:
   - Build command: npm run build
   - Publish directory: .next

4. Create netlify.toml in project root:
   [build]
     command = "npm run build"
     publish = ".next"
   [[plugins]]
     package = "@netlify/plugin-nextjs"

5. Install the plugin:
   npm install -D @netlify/plugin-nextjs

6. Add environment variables in Site settings > Environment variables (same list as Vercel deploy)

7. Deploy.

8. Update Supabase Auth URL Configuration with your Netlify URL.

## Notes
- Free Starter plan: 100GB bandwidth, 300 build minutes/month
- @netlify/plugin-nextjs handles SSR and API routes via Netlify Functions
- Do not use output: export in next.config.js - keep SSR enabled
