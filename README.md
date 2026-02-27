# Tag Along (Public-Launch Foundation)

Tag Along is a dual-mode companionship platform:
- Social plus-one for events and hangouts.
- Errand companionship for practical support.

This build includes a launch-oriented backend foundation with auth, moderation, real user-to-user messaging, and Postgres/Supabase readiness.

## What is implemented
- Polished lane-based UX for Social vs Errand flows.
- Live requests, ranked companions, and safety check-in interactions.
- Real peer matching and messaging:
  - Request owner posts a request.
  - Another verified user taps `Join Request`.
  - Request transitions to matched (`matchedUserId`).
  - Shared chat opens for both users (no simulated companion replies).
- Node API with two storage modes:
  - `json` (local fallback/demo)
  - `postgres` (production path, including Supabase Postgres)
- Auth foundation:
  - Email/password registration/login.
  - Google sign-in.
  - Email verification and password reset with code flows.
  - Session token API (`/api/auth/me`).
- Transactional email provider wiring:
  - `resend`
  - `postmark`
  - `sendgrid`
  - `console` fallback for local development
- Admin console foundation:
  - Overview metrics, user role controls, request status controls.
  - First user is admin.
  - `BOOTSTRAP_ADMIN_EMAIL` can promote a known account on startup.
- Moderation/reporting foundation:
  - Report creation/list/resolve endpoints.
- Rate limiting for API and auth routes.
- Production safety checks:
  - `EXPOSE_DEV_AUTH_CODES` is blocked in production.
  - Production requires real email provider (`resend|postmark|sendgrid`) and `EMAIL_FROM`.

## Project structure
- Frontend: `index.html`, `styles.css`, `app.js`
- Brand assets: `assets/tagalong-app-icon.svg`
- Backend:
  - `backend/server.js`
  - `backend/lib/auth.js`
  - `backend/lib/google-auth.js`
  - `backend/lib/email-sender.js`
  - `backend/lib/postgres-store.js`
  - `backend/scripts/migrate.js`
  - `backend/sql/001_public_launch.sql`
  - `backend/sql/002_match_accept_flow.sql`
  - `backend/sql/003_google_auth_and_admin.sql`
  - `backend/sql/004_messaging_and_auth_recovery.sql`
  - `backend/sql/005_peer_user_matching.sql`
- Demo JSON store: `backend/data/store.json`
- Product strategy: `CONCEPT_NOTE.md`

## Run locally
```bash
cd "/Users/anujsuthar/Documents/New project"
npm install
npm start
```
Open [http://localhost:8787](http://localhost:8787).

## Postgres / Supabase setup (recommended)
1. Create a Supabase project.
2. Copy your `DATABASE_URL`.
3. Create `.env` from `.env.example` and set at minimum:
- `APP_ENV=development` (or `production` on deploy)
- `STORAGE_DRIVER=postgres`
- `DATABASE_URL=...`
- `AUTH_REQUIRED=true`
- `TOKEN_SECRET=<long-random-secret>`
- `GOOGLE_CLIENT_ID=<google-web-client-id>` (optional)
- `BOOTSTRAP_ADMIN_EMAIL=<your-email>` (optional)
- `EXPOSE_DEV_AUTH_CODES=false`
4. Configure email:
- `EMAIL_PROVIDER=resend|postmark|sendgrid` (production)
- `EMAIL_FROM=Tag Along <no-reply@yourdomain.com>`
- Provider key env var (`RESEND_API_KEY` or `POSTMARK_SERVER_TOKEN` or `SENDGRID_API_KEY`)
5. Run migrations:
```bash
npm run migrate
```
6. Start API:
```bash
npm start
```

## Deploy
This repo includes:
- `render.yaml` for Render
- `railway.json` for Railway

Set all required env vars in the platform dashboard, run migrations, then deploy.

## Core API snapshot
- `GET /api/health`
- `GET /api/bootstrap?mode=social|errand`
- `GET /api/feed?mode=social|errand&limit=8`
- `GET /api/requests?mode=social|errand`
- `GET /api/requests/session?requestId=<id>`
- `POST /api/requests`
- `GET /api/matches?requestId=<id>`
- `POST /api/actions/ping`
- `POST /api/actions/join`
- `POST /api/actions/accept`
- `POST /api/checkins`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `POST /api/auth/verify-email/request`
- `POST /api/auth/verify-email/confirm`
- `POST /api/auth/password/forgot`
- `POST /api/auth/password/reset`
- `GET /api/auth/me`
- `GET /api/messages?requestId=<id>`
- `POST /api/messages`
- `POST /api/reports`
- `GET /api/reports`
- `POST /api/reports/resolve`
- `GET /api/admin/overview`
- `GET /api/admin/users`
- `POST /api/admin/users/role`
- `GET /api/admin/requests`
- `POST /api/admin/requests/status`

## Remaining launch work
1. Add verification/KYC provider workflow.
2. Add push notifications for session chat/check-ins.
3. Add observability (error tracking, metrics, incident runbooks).
4. Add legal/compliance flows (ToS, Privacy, consent/reporting policy).
