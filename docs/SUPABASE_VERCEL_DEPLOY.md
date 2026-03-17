# Supabase and Vercel Deploy

## Supabase

1. Create a Supabase project.
2. Run [supabase/migrations/20260308120000_secure_core.sql](/Users/anujsuthar/Documents/Withly/supabase/migrations/20260308120000_secure_core.sql) in the SQL editor.
3. In Auth settings:
   - add your production site URL
   - add `/auth/callback` and `/auth/reset-password` redirect URLs
   - enable email confirmation
   - enable Google OAuth if you want social sign-in
4. Promote the first admin manually:

```sql
update public.profiles
set role = 'admin'
where id = '<user-uuid>';
```

## Vercel

1. Import the repo into Vercel.
2. Set production environment variables from [.env.example](/Users/anujsuthar/Documents/Withly/.env.example).
3. Add `NEXT_PUBLIC_SITE_URL` with the final production URL.
4. Deploy once, sign in, and confirm the auth callback and password reset flows.

## Recommended production extras

- Cloudflare Turnstile for sign-up, sign-in, password reset, and request creation
- a monitored support mailbox
- uptime checks against `/api/health`
- structured log shipping for JSON event logs
