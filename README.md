# Tag Along

Tag Along is a dual-mode companionship product for two use cases:
- Social plus-one for events and public hangouts.
- Errand companionship for practical support.

This repo has been migrated to:
- Next.js App Router
- React 19
- TypeScript
- Supabase Auth
- Supabase Postgres with RLS
- Supabase Realtime for private session chat

## Why this rebuild

The previous app exposed too much through public endpoints and kept sensitive local/demo data in the repo. The new foundation prioritizes:
- managed auth instead of custom session code
- row-level security instead of trust-by-convention
- sanitized public feed data instead of public full request records
- realtime chat restricted to actual session participants
- env-only secrets and no checked-in data store

## Current product surface

- marketing landing page with secure auth entry
- authenticated workspace with:
  - request composer
  - safe discovery feed
  - private join-review queue
  - private matched-session chat
- private report, block, completion, account export, and delete-account flows
- admin moderation queue for reports and deletion requests
- public privacy, terms, community, and safety pages
- Supabase RPC layer for request creation, join requests, accept/decline flow, and messaging
- database migration with tables, triggers, functions, grants, and RLS policies

## Local setup

1. Create a Supabase project.
2. In the Supabase SQL editor, run the migration in [supabase/migrations/20260308120000_secure_core.sql](/Users/anujsuthar/Documents/Tag-along/supabase/migrations/20260308120000_secure_core.sql).
3. Copy [.env.example](/Users/anujsuthar/Documents/Tag-along/.env.example) to `.env.local` and fill in:
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` for admin log/event/deletion features
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` for public anti-bot protection
   - `NEXT_PUBLIC_SUPPORT_EMAIL`
4. Install dependencies:
```bash
npm install
```
5. Start the app:
```bash
npm run dev
```
6. Open [http://localhost:3000](http://localhost:3000).

If Supabase env vars are missing, the UI still renders in preview mode using safe mock data.

## Promote an admin

There is no "first user becomes admin" behavior anymore.

To promote an account manually in Supabase:
```sql
update public.profiles
set role = 'admin'
where id = '<user-uuid>';
```

## Structure

- `app/`: Next.js routes, layouts, workspace, auth callback
- `components/`: interactive React UI
- `lib/`: env helpers, Supabase clients, queries, validators, mock preview data
- `supabase/migrations/`: database schema, RLS, RPCs, and realtime publication
- `tests/`: Playwright smoke coverage for public pages and preview mode
- `docs/`: public release, deploy, security cleanup, and ops runbook docs
- `CONCEPT_NOTE.md`: original product framing

## Verification

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## Public release docs

- [Production release checklist](/Users/anujsuthar/Documents/Tag-along/docs/PRODUCTION_RELEASE_CHECKLIST.md)
- [Supabase and Vercel deploy](/Users/anujsuthar/Documents/Tag-along/docs/SUPABASE_VERCEL_DEPLOY.md)
- [Security history cleanup](/Users/anujsuthar/Documents/Tag-along/docs/SECURITY_HISTORY_CLEANUP.md)
- [Operations runbook](/Users/anujsuthar/Documents/Tag-along/docs/OPERATIONS_RUNBOOK.md)

## Notes

- The app is designed to keep public discovery minimal. Session details and matched identities are only available to participants through Supabase policies and secured RPCs.
- Realtime chat requires the `request_messages` table to stay in the Supabase realtime publication. The migration handles this when the publication exists.
