# Operations Runbook

## Health checks

- Application health: `/api/health`
- Expected response: JSON with `status: "ok"` and current env flags

## Incident triage

1. Check the latest deploy status.
2. Check health endpoint response.
3. Review recent structured logs for `auth.*`, `request.*`, `turnstile`, and `account.delete`.
4. Confirm Supabase Auth and database status in the Supabase dashboard.
5. If the issue affects sign-in or request creation, consider temporarily disabling public promotion until the root cause is fixed.

## Moderation incidents

1. Open the admin moderation panel.
2. Move active cases to `reviewing`.
3. Resolve or dismiss with a note.
4. If a report requires external escalation, preserve the account export or database context before deleting data.

## Backups and recovery

- Use Supabase-managed backups for point-in-time recovery where available.
- Record the exact deployment SHA and migration state before any recovery action.
- Re-run verification after recovery:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

## Release rollback

- Roll back the Vercel deployment to the previous healthy build.
- Do not roll back database schema destructively without a data recovery plan.
