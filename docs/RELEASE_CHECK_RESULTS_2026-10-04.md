# Release check results — October 4, 2026

## Completed evidence

- Production health: HTTP 200 / `status: ok` on October 4. Recovered source and fixes are merged through PRs #2 and #3; main merge commit `c3f98f82576d70088a7d0d12f6af974659f6113f`. At verification time, production deployment `dpl_4xDcc1XoPqRPDqaKjRjdxdvY4sDf` was aliased to withly.in; later documentation-only merges may create a new deployment without changing application code.
- Browser reconnect recovery: on October 3, Chrome Guest showed Offline, failed network requests, and `Live updates paused`. A test message sent while offline was absent. After the owner switched to No throttling without refreshing or pressing Reconnect chat, the agent observed `Live chat connected` and the missing message. This is a functional offline-to-online recovery pass, not a background latency measurement.
- Fresh-message browser observation was interrupted by the scheduled backup; that Chrome Guest window had been closed when work resumed. Do not claim the subsequent browser INSERT was observed in that same session.
- Separate October 4 hosted-controller reconnect test passed against production using normal member JWTs and the same `connectChatRealtime` controller as the app: initial listener ready; receiver disposed and socket disconnected; message persisted while absent from receiver state; a fresh listener recovered it exactly once; a subsequent new message arrived via the real INSERT callback, not a snapshot. This is hosted transport/controller evidence, not a replacement for a strict browser-only timing test.
- Both reconnect-test Auth users, profiles, request, messages and notifications were permanently removed by exact fixture IDs; absence verified. Main owner remains present. No main-account credentials or unrelated data were changed.
- October 4 scheduled backup completed: encrypted database and Storage archives verified and uploaded to the owner-private Drive folder. Sharing showed Restricted and exactly the owner. Drive confirmed both uploads complete. An initial CLI connection failure recovered on retry without credential changes. Execution occurred around 14:25 IST, not proof of exact 09:00 timing. Earlier production-snapshot SQL restore/security tests and Storage byte/hash recovery drill remain valid; a complete hosted Auth/Storage/browser cutover was not performed.
- Backup pair: `withly-2026-10-04T08-54-48.402Z-2dfb1dc9.dump.enc` and `withly-storage-2026-10-04T08-54-46.843Z.tar.enc`. No plaintext/key upload; older backups preserved.
- Expiry configuration verified through Vercel API on current production: enabled, `/api/cron/expire-requests`, daily 00:00 UTC. Current aggregate: zero overdue open requests. Anonymous invocation returned 401. Neither configuration nor zero backlog proves automatic execution.

## Pending automatic observation

Vercel reports the project scope uses Hobby. [Vercel runtime-log documentation](https://vercel.com/docs/logs/runtime) gives one-hour retention, and [Hobby cron timing](https://vercel.com/docs/cron-jobs/usage-and-pricing) allows execution anywhere in the configured hour. The earlier execution window was outside retained logs; historical execution remains unverified.

The existing local backup heartbeat now temporarily includes read-only expiry checks at 06:15 and 06:45 Asia/Kolkata, preserving the daily 09:00 backup. The checks must inspect actual execution evidence, must not invoke the endpoint, and must restore the original backup-only cadence after success. The schedule was validated to produce precisely 06:15, 06:45 and 09:00. The Mac and Codex must be running; delayed wakeups may miss short-lived logs. This follows the [official local scheduling guidance](https://learn.chatgpt.com/docs/automations?surface=app). No paid service or production schedule change was made.

## Needs the owner or an independent tester

1. Have a consenting person with an unrelated inbox complete real signup, email confirmation and sign-in. No such tester has been supplied. Another alias of the owner's Gmail is not independent evidence.
2. Save a secure recovery copy of `/Users/anujsuthar/.config/withly-backup/encryption.key` in a password manager or separate offline medium. Do not paste it into chat or put it beside the Google Drive archives. Separate owner custody remains unconfirmed.
3. Keep this Mac on and Codex running during the pending expiry-observation windows and backup time, with existing service sign-ins valid.

## Scope and optional features

No application-runtime change or deployment was needed during these October 4 checks. The eight chat-controller unit regressions passed in the preceding reconnect run. Prior build, database authorization, moderation and avatar-deletion evidence is recorded in LAUNCH_HARDENING_STATUS.md. Push has no browser opt-in flow and must not be advertised. A UI redesign and push implementation are not part of these remaining release checks.
