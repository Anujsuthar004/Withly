# Withly

Withly helps adults find one coworking companion, study partner, or coffee buddy for a clear, low-stakes session in a public space.

## What is implemented

- Supabase email authentication and email-confirmation gating
- Public request discovery with sensitive meetup details withheld until sign-in
- One-to-one join requests, matching, private session chat, and completion feedback
- Expiring requests, recurring availability, notifications, blocking, and reporting
- In-app safety check-ins and an in-app SOS alert to the matched companion
- Admin review queues, account export, and deletion-request workflows
- Row Level Security plus explicitly granted RPC access in Postgres
- Cloudflare Turnstile on public auth flows and server-side rate limiting
- Optional browser push notifications through VAPID and a signed database webhook

Withly does **not** contact emergency services, send an SOS to an external emergency contact, perform criminal background checks, or currently verify government identity. Users should call their local emergency number when they are in danger.

## Stack

- Next.js 16, React 19, TypeScript
- Supabase Auth, Postgres, Storage, and Realtime
- Zod validation and Playwright end-to-end tests
- Vercel deployment and scheduled request expiry

## Local setup

1. Install Node.js 24 and run `npm ci`.
2. Copy `.env.example` to `.env.local` and provide the required values.
3. Link the Supabase CLI to the intended project and run `supabase db push`.
4. Start the app with `npm run dev`.

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `VAPID_PRIVATE_KEY`, `PUSH_WEBHOOK_SECRET`, or `CRON_SECRET` to browser code.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm audit --omit=dev --audit-level=high
```

Browser tests run with isolated test configuration and never connect to the live Supabase project. CI also applies every migration to a disposable PostgreSQL 17 database and exercises authorization, matching, completion, expiry, and rate limits. To run that suite locally, set `PGHOST`, `PGPORT`, `PGUSER`, and `PGDATABASE` to an empty test database, then run `bash scripts/test-database.sh`.

Deployment instructions and required production checks are in [`docs/SUPABASE_VERCEL_DEPLOY.md`](docs/SUPABASE_VERCEL_DEPLOY.md) and [`docs/PRODUCTION_RELEASE_CHECKLIST.md`](docs/PRODUCTION_RELEASE_CHECKLIST.md).

## Safety model

The database is the authorization boundary: sensitive tables use RLS, privileged RPCs check the caller, operational logging and rate-limit tables are service-only, and public feed functions return a deliberately limited projection. Application validation remains defense in depth and is not a substitute for database authorization.
