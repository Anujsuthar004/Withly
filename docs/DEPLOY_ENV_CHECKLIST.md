# Deploy Environment Checklist

Complete these steps before going live. Each section covers one external service.

## 1. Vercel Environment Variables

In **Vercel → Project → Settings → Environment Variables**, add these for the **Production** scope:

| Variable | Value |
|---|---|
| `APP_ENV` | `production` |
| `NEXT_PUBLIC_SITE_URL` | Your production URL, e.g. `https://withly.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Your monitored support email |
| `CRON_SECRET` | Long random secret used by the request-expiry scheduler |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser-push public key, if push is enabled |
| `VAPID_PRIVATE_KEY` | Browser-push private key, if push is enabled |
| `PUSH_WEBHOOK_SECRET` | Secret shared with the Supabase notification webhook, if push is enabled |

After saving, trigger a **Redeploy** so the new values take effect.

## 2. Supabase Auth Settings

In **Supabase → Authentication → URL Configuration**:

- **Site URL**: set to your production domain (e.g. `https://withly.app`)
- **Redirect URLs**: add both:
  - `https://withly.app/auth/callback`
  - `https://withly.app/auth/reset-password`

In **Supabase → Authentication → Email Templates**:

- **Enable email confirmation** (confirm email toggle)
- Review confirmation and password-reset email templates

## 3. Cloudflare Turnstile

In **Cloudflare → Turnstile**:

1. Create a new widget.
2. Set the **domain** to your production domain (e.g. `withly.app`).
3. Choose **Managed** mode for best balance of security and UX.
4. Copy the **Site Key** → paste into Vercel as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
5. Copy the **Secret Key** → paste into Vercel as `TURNSTILE_SECRET_KEY`.

Without these keys in production, protected auth and creation flows fail closed with a service-unavailable response.

## 4. Database and Scheduled Expiry

- Run `supabase db push` and verify `supabase migration list` shows no pending local migration.
- Keep the Vercel cron in `vercel.json` enabled, or configure an equivalent scheduler.
- The daily cleanup scheduler must send `Authorization: Bearer <CRON_SECRET>` to `/api/cron/expire-requests`. Expired requests are already hidden and cannot accept joins before this cleanup runs.
- If browser push is enabled, configure a Supabase Database Webhook for notification inserts to `/api/push/notify` with the same `PUSH_WEBHOOK_SECRET` bearer token.

## 5. Post-Deploy Verification

After completing the above:

- [ ] Visit `/api/health` and confirm HTTP 200 with `status: "ok"`
- [ ] Sign up with a new email and confirm the verification email arrives
- [ ] Sign in and verify redirect to `/feed`
- [ ] Test forgot-password flow
- [ ] Verify Turnstile widget appears on the auth forms
- [ ] Promote the first admin account with the SQL in the deployment guide
- [ ] Create an expiring request and invoke the authenticated cron endpoint
- [ ] Confirm an anonymous feed response does not include meetup area, time, or host identity
