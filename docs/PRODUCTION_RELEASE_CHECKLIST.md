# Production Release Checklist

## 1. Security cleanup

- Rotate any deploy, OAuth, email, or third-party credentials that ever lived in git.
- Remove old secrets and test-user data from git history with a history rewrite, then force-push carefully.
- Confirm `.env.local`, `.env.production`, and Supabase service keys are ignored and not present in the repository.

## 2. Environment readiness

- Configure `.env.local` and production envs from [.env.example](/Users/anujsuthar/Documents/Tag-along/.env.example).
- Set `NEXT_PUBLIC_SITE_URL` to the canonical production domain.
- Set `SUPABASE_SERVICE_ROLE_KEY` only in server-side environments.
- Configure Turnstile before public signups or public request creation.

## 3. Database and auth

- Run [supabase/migrations/20260308120000_secure_core.sql](/Users/anujsuthar/Documents/Tag-along/supabase/migrations/20260308120000_secure_core.sql).
- Enable Supabase email confirmation, password recovery, and any OAuth providers you intend to expose publicly.
- Manually promote the initial admin account after first sign-in.

## 4. Product controls

- Verify report, block, completion, export, and delete-account flows in production.
- Verify admin moderation queue access with a real admin account.
- Confirm public discovery feed only shows sanitized fields.

## 5. Monitoring and rollback

- Put a monitor on `/api/health`.
- Route runtime logs to your production log sink.
- Confirm you can roll back the Next deployment and recover the Supabase project from backups.

## 6. Legal and support

- Review the public legal pages before launch.
- Point the support mailbox at an actively monitored inbox.
- Prepare a moderation escalation path for urgent safety reports.

## 7. Final gate

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`
