# Supabase and Vercel Deploy

## Supabase

1. Create a Supabase project.
2. Install and authenticate the Supabase CLI, link the intended project, and apply **every** pending migration in order:

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase migration list
```

Do not apply only the first SQL file. The later migrations contain required authorization and launch-hardening fixes.
3. In Auth settings:
   - add your production site URL
   - add `/auth/callback` and `/auth/reset-password` redirect URLs
   - enable email confirmation
4. Promote the first admin manually:

```sql
update public.profiles
set role = 'admin'
where id = '<user-uuid>';
```

## Vercel

1. Import the repo into Vercel.
2. Set production environment variables from [`.env.example`](../.env.example).
3. Add `NEXT_PUBLIC_SITE_URL` with the final production URL.
4. Keep the daily cleanup cron in `vercel.json` enabled. The feed and join checks enforce expiry immediately, independently of this cleanup job.
5. Deploy once, sign in, and confirm the auth callback and password reset flows.

## Required production operations

- Cloudflare Turnstile for sign-up, sign-in, password reset, and request creation (required in production)
- a monitored support mailbox
- uptime checks against `/api/health`
- structured log shipping for JSON event logs
