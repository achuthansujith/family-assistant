# Deploy to Vercel

## Prerequisites
- Vercel account (free Hobby plan)
- Supabase project set up with migrations run
- Code pushed to GitHub, GitLab, or Bitbucket

## Steps

1. Go to https://vercel.com/new and import your repository

2. Vercel auto-detects Next.js. Leave build settings as defaults.

3. Add environment variables under Settings > Environment Variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - NEXT_PUBLIC_APP_URL  (set to your Vercel URL, e.g. https://homebase.vercel.app)
   - APP_URL              (same as above)
   - AI_ENABLED           (false to start, true once you add OpenAI key)
   - OPENAI_API_KEY       (optional)
   - AI_MAX_CALLS_PER_DAY (3)
   - OPENAI_MAX_TOKENS    (300)
   - OPENAI_MODEL         (gpt-4o-mini)

4. Click Deploy.

5. After deploy, go to Supabase > Authentication > URL Configuration and add:
   - Site URL: https://your-app.vercel.app
   - Redirect URLs: https://your-app.vercel.app/auth/callback

## Notes
- Hobby plan is free and sufficient for 2 users
- Serverless functions handle API routes automatically
- No always-on server cost
- Redeploys happen automatically on git push
