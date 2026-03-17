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

In **Supabase → Authentication → Providers** (optional):

- Enable **Google OAuth** if you want social sign-in
- Set the OAuth callback URL to `https://<project-ref>.supabase.co/auth/v1/callback`

## 3. Cloudflare Turnstile

In **Cloudflare → Turnstile**:

1. Create a new widget.
2. Set the **domain** to your production domain (e.g. `withly.app`).
3. Choose **Managed** mode for best balance of security and UX.
4. Copy the **Site Key** → paste into Vercel as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
5. Copy the **Secret Key** → paste into Vercel as `TURNSTILE_SECRET_KEY`.

Without these keys, sign-up, sign-in, password reset, and request creation have **no bot protection**.

## 4. Post-Deploy Verification

After completing the above:

- [ ] Visit `/api/health` and confirm `status: "ok"` and `appEnv: "production"`
- [ ] Sign up with a new email and confirm the verification email arrives
- [ ] Sign in and verify redirect to `/workspace`
- [ ] Test forgot-password flow
- [ ] Verify Turnstile widget appears on the auth forms
- [ ] Promote the first admin account (see README)
