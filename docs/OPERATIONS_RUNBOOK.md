# Operations Runbook

## Health checks

- Application health: `/api/health`
- Expected production response: HTTP 200 with JSON `status: "ok"`
- HTTP 503 means required configuration or the database dependency is unavailable; detailed flags are intentionally shown only outside production.

## Incident triage

1. Check the latest deploy status.
2. Check health endpoint response.
3. Review recent structured logs for `auth.*`, `request.*`, `turnstile`, and `account.delete`.
4. Confirm Supabase Auth and database status in the Supabase dashboard.
5. Check the Vercel cron history if requests are not expiring.
6. If the issue affects sign-in or request creation, consider temporarily disabling public promotion until the root cause is fixed.

## Moderation incidents

Owner: Anuj Suthar confirmed responsibility for daily support and safety-report handling on September 30, 2026. Public support inbox: `sutharanuj530@gmail.com`. The moderation dashboard is `/admin`; sign in with the owner's main account, not a test alias.

1. Open the admin moderation panel.
2. Move active cases to `reviewing`.
3. Resolve or dismiss with a note.
4. If a report requires external escalation, preserve the account export or database context before deleting data.

## Backups and recovery

- The latest Supabase inspection listed no available backups and PITR disabled. Do not assume managed recovery is available on this project.
- The owner chose free encrypted backups. Follow [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md) for credential setup, encryption-key custody, off-device storage and restore verification. Production scheduling/storage is not configured yet.
- Record the exact deployment SHA and migration state before any recovery action.
- Re-run verification after recovery:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

## Release rollback

- Roll back the Vercel deployment to the previous healthy build.
- Auth now delegates single-use CAPTCHA verification to Supabase Auth, where Turnstile must remain enabled. Do not roll back to a build that verifies the same auth token with Cloudflare first: double verification rejects every login. Select a compatible build or coordinate the auth change with a tested recovery plan.
- Do not roll back database schema destructively without a data recovery plan.

## Expiry scheduling

- Vercel confirmed `/api/cron/expire-requests` enabled on the current production deployment with schedule `0 0 * * *` (daily 00:00 UTC / 05:30 India time).
- An authenticated manual run returned HTTP 200 and `expiredCount: 0` on September 30. This verifies execution, not historical scheduler delivery. No matching historical cron logs were returned by the available CLI query.

## Source recovery

- The original iCloud Documents checkout has missing Git objects. Do not reset or force-push it.
- A clean clone with the current source is available at `/Users/anujsuthar/Developer/withly-release-recovery.RJlwTT`, branch `codex/launch-recovery-sep30`. Its Git connectivity check passes. Secrets, build outputs, and the damaged `.git` were not copied.
