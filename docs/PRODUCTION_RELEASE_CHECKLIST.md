# Production Release Checklist

## 1. Security cleanup

- Rotate any deploy, OAuth, email, or third-party credentials that ever lived in git.
- Remove old secrets and test-user data from git history with a history rewrite, then force-push carefully.
- Confirm `.env.local`, `.env.production`, and Supabase service keys are ignored and not present in the repository.

## 2. Environment readiness

- Configure `.env.local` and production envs from [`.env.example`](../.env.example).
- Set `NEXT_PUBLIC_SITE_URL` to the canonical production domain.
- Set `SUPABASE_SERVICE_ROLE_KEY` only in server-side environments.
- Configure Turnstile before public signups or public request creation.
- Enable Turnstile in Supabase Auth using the matching secret. Auth routes pass the token to Supabase; they must not consume the same token with a separate siteverify call first.
- Use one canonical production origin (`https://withly.in`) in Vercel and Supabase Auth redirect settings.
- Configure `CRON_SECRET`, and verify the daily cleanup job is authorized and running.

## 3. Database and auth

- Run `supabase db push`; verify every migration, including the public-launch hardening migration, is applied.
- Enable Supabase email confirmation, password recovery, and any OAuth providers you intend to expose publicly.
- Configure a verified custom SMTP sender; the built-in Supabase sender is team-only and is not a production email service. Disable link tracking. Test confirmation and recovery delivery to a non-team inbox.
- Manually promote the initial admin account after first sign-in.
- Review existing admin roles and elevated verification tiers: the old client permissions allowed self-promotion, so existing records need an owner review.

## 4. Product controls

- Verify report, block, completion, export, and delete-account flows in production.
- Verify admin moderation queue access with a real admin account.
- Confirm public discovery feed only shows sanitized fields.
- Test that a member cannot update `role`, `verification_tier`, or `verification_note` through the REST API.
- Test that non-admin members cannot call moderation or maintenance RPCs.

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
- `npm run test:production` (set public Supabase URL/key to include direct Auth CAPTCHA checks)
- Explicitly authorized hosted three-account backend checks, plus separate real-browser acceptance tests
- Database authorization job passes (all migrations plus member/admin boundary tests on disposable PostgreSQL)
- `npm audit --omit=dev --audit-level=high`
- `/api/health` returns HTTP 200 in the production deployment
