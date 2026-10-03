# Launch hardening status — October 3, 2026

The security and responsive-layout fixes are deployed to **https://withly.in**.
Current runtime: commit `8daa846`, including immediate offline chat status,
(`https://withly-lk4n9x9ir-a1-04.vercel.app`, aliased to `https://withly.in`).

**Public launch is not signed off yet. SMTP is configured, recovery delivery is verified, and the owner reports completing recovery; the remaining acceptance and operational checks are listed below.**
Do not describe the application as “100% verified end-to-end.”

## Completed

- PR #2 was merged after the owner requested completion of all remaining items. Merge commit: `34604f7`. Follow-up PR #3 contains offline-state handling and a secure production backup runner; its runtime change is deployed and CI checks pass.
- Created and uploaded encrypted production database and Storage snapshots on October 3. Restored the database into a network-isolated local Supabase PostgreSQL container, retaining ACLs; both security/session-safety SQL suites passed. Storage archive extraction and hashes passed. Daily 09:00 backup task created; separate owner key custody and first unattended run remain outstanding. See [backup evidence](BACKUP_RECOVERY.md).
- Deployed authenticated realtime initialization, Postgres-listener readiness, authorized catch-up with event-race handling, and visible connection/reconnect controls. No database migration or security-setting change was required. The two-browser functional exchange was observed without receiver reload, with native Chrome observation/focus caveats documented in [the acceptance record](TWO_BROWSER_ACCEPTANCE.md).
- Corrected the callback test's hard-coded loopback hostname; compare the full expected origin.
- Separated isolated preview tests from live public-surface checks. `BASE_URL` cannot silently send the preview suite to production.
- Replaced the overclaiming two-account script with explicit three-account hosted backend checks. Blocking is tested during matched sessions, before completion; unrelated sessions must survive. Outsider/anonymous chat reads and outsider writes are denied. Cleanup checks every operation and verifies fixture absence.
- Enabled Cloudflare Turnstile in **Supabase Auth itself**, closing the direct-Auth-API bypass. Authentication tokens are passed to Supabase for single-use verification. Posting continues to verify tokens server-side through Cloudflare.
- Corrected the production site URL to `https://withly.in`; `www` redirects to this canonical origin.
- Routed recovery emails through the PKCE callback and added a helpful error page instead of silently ignoring failed code exchange. Email URL construction handles trailing slashes.
- Disabled auth controls until hydration so early clicks are not lost.
- Fixed desktop-sidebar overrides on phone/tablet widths. Account settings and sign-out remain reachable above the mobile navigation.
- Added deployment exclusions for local credentials, generated files, and local Supabase configuration.
- Verified `withly.in` in Resend via GoDaddy sending-only DNS records. Configured Supabase SMTP through Resend's native integration, using a send-only key and `Withly <noreply@withly.in>` (`smtp.resend.com:465`, SMTP user `resend`). The management API confirms the saved settings and continued CAPTCHA enforcement. Supabase's configured email rate limit is now 25/hour; Resend's observed free-plan daily cap is 100.
- The owner confirmed daily responsibility for the support inbox and moderation queue.
- Account export and permanent deletion were exercised through the live UI with explicit owner approval, using only the temporary release account. The JSON export was parsed successfully; Auth/profile/storage queries confirmed zero remaining rows for that test account. Its export remains in Downloads. This fixture had no avatar, so deletion of a real uploaded avatar remains separately unverified in the UI.
- The owner moderation UI moved a clearly labelled fixture from open to reviewing to resolved; the database recorded the note and correct resolving admin. Only that fixture was removed afterward. An old extra admin profile was inspected: its Auth account was already soft-deleted in March, not an active additional administrator.
- Vercel confirms the daily expiry schedule is enabled on the current production deployment. An authorized manual execution returned HTTP 200, `expiredCount: 0`. Historical scheduler execution was not proved by the available log query.
- Created a clean source-recovery clone outside iCloud at `/Users/anujsuthar/Developer/withly-release-recovery.RJlwTT`, branch `codex/launch-recovery-sep30`, preserving the original damaged checkout and excluding secrets/build outputs. Git connectivity passes in the recovery clone.
- Added encrypted PostgreSQL backup tooling and a recovery guide. Created the owner's selected Google Drive folder, **Withly Encrypted Backups**, and verified Restricted access with only the owner listed. It is empty: production credentials, uploads and scheduling are not configured; no production recovery point is claimed.

The previous launch hardening remains in place: profile privilege restrictions, forced RLS on sensitive tables, RPC authorization/rate limits, safe redirects, block-triggered session cancellation, avatar cleanup/hard account deletion, and deleted-member message redaction.

## Verification completed

- Node 24 production build, TypeScript and lint: passed.
- Unit regression tests: **23 passed**, including eight realtime-controller regressions and encrypted-backup round-trip, tamper rejection and wrong-key rejection without publishing plaintext.
- Isolated Chromium browser tests: **36 passed**, including phone/tablet navigation at 390, 768 and 1024 pixels.
- All **12 migrations** applied successfully to a fresh disposable PostgreSQL database; authorization and session-safety SQL assertions passed.
- All 12 migrations are recorded in hosted Supabase; the safety/deletion triggers and inspected RLS settings are enabled.
- Hosted three-account backend checks passed, including active block/report-and-block, completion, unauthorized access, and verified cleanup.
- Extended the hosted checks with real WebSocket delivery in both participant directions: passed. The first harness attempt missed delivery before explicitly attaching its member JWT; after waiting for authentication, both directions and the full safety suite passed. This did not demonstrate a production UI defect, and is not a two-browser UI test.
- October 3 rerun uses the production chat controller itself and counts only actual INSERT callbacks as delivery; both directions and all hosted safety checks passed with verified cleanup. Production health returned 200 after the approved deployment. GitHub verification and database jobs passed for `8233ee0`.
- Local encrypted backup/restore drill passed on October 1: applied all 12 migrations to an empty isolated PostgreSQL database, encrypted/dumped it, authenticated/decrypted it, restored into another empty database, and reran security/session-safety SQL assertions. The first drill exposed discarded grants; the backup now preserves ACLs and the corrected restore passes. This is a local test database, not a production snapshot or Storage-object recovery test.
- Dependency audit: **0 vulnerabilities** reported, including development dependencies.
- Real browser signup with a fresh production Turnstile token succeeded. The owner confirmed email receipt/confirmation, and the test account signed in.
- A fresh browser sign-out/sign-in on September 30 also succeeded after Supabase Auth CAPTCHA enforcement was enabled, using the real production Turnstile widget.
- A real browser password-reset request to the owner's approved Gmail test alias was accepted. Resend reports **Delivered** for the resulting "Reset Your Password" email on September 30. The owner subsequently reported completing the requested reset/sign-in steps, and the agent observed the authenticated `/feed` with account settings and sign-out controls. Password entry and new-password sign-in are owner-reported, not independently observed by the agent; no new password or reset token was collected.
- Real browser request publishing succeeded; the temporary request was removed from the user's request list.
- Live API checks confirmed health 200, safe callback redirects, anonymous export/maintenance rejection, and missing/invalid CAPTCHA rejection at both the app and direct Supabase Auth boundaries.
- Latest live public-surface suite: **6 passed**, including the direct Supabase Auth CAPTCHA boundary. An earlier run failed due to network timeouts/`ERR_INTERNET_DISCONNECTED`; after recovery, the complete suite passed without retries.

The hosted backend script deliberately uses admin-provisioned fixtures and normal member JWTs. It verifies hosted WebSocket delivery, but is **not** proof of browser signup, email delivery, two-browser UI chat, or the user-facing deletion flow.

## Remaining release gates

1. **New-member email acceptance:** SMTP setup is complete, the sending domain is **Verified**, and Resend confirmed recovery-email delivery. Still test a fresh signup to an unrelated non-team inbox. Public DNS resolves the exact Resend DKIM TXT at `resend._domainkey`, `send` CNAME to `send.forge.rmta.net`, and `rsend` CNAME to `rsend-apne1.forge.rmta.net`. The website health check passes; root MX remains absent as before. The sending domain does not provide a monitored inbound mailbox; public support remains the owner's Gmail address.
2. **User-facing acceptance:** After the approved chat fix, messages were observed in both real browsers without receiver reload. This is a qualified functional pass: native Chrome observations stayed stale until interaction and visibility catch-up may contribute; strict background delivery timing and forced network-reconnect browser acceptance are not proved. See [the acceptance record](TWO_BROWSER_ACCEPTANCE.md), which preserves the earlier failed run. Finish account deletion with an uploaded avatar. Moderation and export/deletion without an avatar passed. Hosted WebSocket/RLS tests are not a substitute for remaining UI checks.
3. **Production recovery:** Encrypted production database and Storage snapshots are now off-site, the production-snapshot database restore/security tests and Storage byte/hash drill passed, and a daily task is configured. Owner must keep a separate secure recovery key copy; the first unattended backup run and a complete restored hosted-service/browser cutover remain unverified. The local task depends on the Mac/app and valid service sign-ins. Optional push currently has server plumbing but no browser opt-in flow; do not advertise push delivery.
4. **Source control:** Recovered source and the initial chat fix are merged into `main` through [PR #2](https://github.com/Anujsuthar004/Withly/pull/2). Follow-up work is tracked in [PR #3](https://github.com/Anujsuthar004/Withly/pull/3). GitHub verification/database jobs passed and the offline-state runtime is deployed.

The owner resumed the previously parked backup work on October 3. Independent-inbox signup remains unverified because the owner has no available unrelated tester. A fresh October 3 Vercel historical-log query returned no expiry execution records; keep automatic scheduler execution unverified rather than treating the earlier manual run as proof.

## Reproduce checks

```sh
npm run test:unit
npm run lint
npm run test:e2e
npm run test:production
npm audit --audit-level=high
```

Supply the public `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the production suite to include the direct-Auth CAPTCHA boundary test. Without them that test explicitly skips.

Run `npm run test:database` only against an empty disposable database using explicit `PG*` variables. Run `npm run test:hosted` only with `WITHLY_ALLOW_LIVE_TEST=yes` and credentials for the intended project. Optionally set `WITHLY_TEST_ENV_FILE` to a protected, untracked environment file. The hosted script creates briefly visible, clearly labelled test requests and removes only its own generated fixture IDs.

Health 200 means required environment values are present and a database probe succeeds. It does not prove SMTP, email delivery, CAPTCHA credential correctness, all RLS boundaries, cron execution, or push delivery.
