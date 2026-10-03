# Two-browser chat acceptance — October 3, 2026

## Latest outcome — deployed fix, October 3 at 06:34–06:39 UTC

**Two-browser send/receive flow observed without receiver reload.** This is a qualified functional pass, not an isolated browser-WebSocket latency or forced-disconnect/reconnect pass. Chrome's native accessibility/screenshot observations were stale until window interaction; the app also catches up when made visible. Those mechanisms prevent attributing every observed incoming message exclusively to a WebSocket event.

- Owner approved deploying commit `8233ee0` directly, without a PR merge or database/security-setting changes. Production was aliased to `https://withly-g60bq0qq9-a1-04.vercel.app`; health returned 200.
- The new controller authenticates before subscribing, waits for the Postgres listener, merges an authorized catch-up snapshot with concurrent events, and exposes connection/reconnect status. Both real browsers displayed **Live chat connected**.
- Browser A: owner's authenticated in-app browser. Browser B: Chrome Guest, temporary admin-provisioned account, normal sign-in UI with automatic Turnstile success. The matched session was an explicit test fixture, not a browser signup/approval test.
- A1 submission began at 06:36:33 UTC but persisted only at 06:37:07. Peer subsequently displayed it without page navigation/reload. Do not report the slow initial send as low-latency delivery.
- B1 persisted at 06:37:34.935 UTC; A displayed it by 06:37:39.597 without receiver navigation, reload, or another send.
- A2 persisted at 06:37:55.841 UTC. Chrome's stale view initially omitted it, then its refreshed accessibility view showed it after a harmless click on existing message text, without navigation, reload, or sending another message. This establishes incoming UI recovery on interaction, not a precise background-delivery timing claim.
- Separate hosted tests using the same controller passed in both directions using actual INSERT-event callbacks (snapshots cannot fulfill the delivery assertion), plus outsider access denial, active blocking/reporting, completion, and fixture cleanup. Run: `04aba052-2d41-411d-9939-ca9156264509`.
- New verification: 23 unit tests, lint, TypeScript, production build, and GitHub verification/database jobs passed. Unit tests cover listener readiness, catch-up/event races, failures, and disposal. A forced network-disconnect/reconnect browser test remains unperformed.
- Cleanup verified: the temporary Auth account/profile, request, all messages, and three fixture notifications are absent. Main owner remains present. Chrome Guest was closed and the owner's inbox was refreshed. No credentials or fixture passwords are stored in this record.

## Earlier outcome — before the fix

**Not passed.** Sending/persistence worked; automatic receipt in the other browser was not observed. Do not claim two-browser realtime acceptance is complete or attribute the failure to a specific code defect yet.

## Setup and observations

- Site: `https://withly.in`, using its deployed production application.
- Browser A: the owner's already authenticated in-app browser.
- Browser B: Chrome Guest, signed into a temporary, admin-provisioned, email-confirmed member account through the normal sign-in UI. Turnstile completed automatically; no protection was disabled.
- A clearly labelled matched-session fixture was seeded for the owner and temporary peer. This test did not exercise browser signup or host approval.
- Earlier October 1 attempts persisted three messages, but were interrupted and did not establish live receipt. Chrome was closed when work resumed October 3, so a fresh guest session was used.
- October 3 at 04:48:21 UTC: browser A sent the A3 marker; the app reported success and the database stored it. Browser B's unreloaded rendered conversation still omitted it.
- At 04:48:47 UTC: browser B sent the B3 marker; the database stored it. At approximately 04:49:13 UTC and the following browser observation, browser A still had no matching message element without reloading.
- No successful two-way live exchange was observed. A subsequent browser A reload encountered `ERR_TIMED_OUT`; the independent HTTP health probe returned 200. This prevents clean attribution to the app's realtime subscription versus the browser/network connection.
- No production runtime changes, merge, or deployment were made for this check. GitHub PR #2 publishes the recovered source and has passing verification/database checks; those do not override this live acceptance failure.

## Earlier cleanup and follow-up

Cleanup was verified after the run: the temporary account, profile, conversation, messages, and five fixture notifications were removed. The owner's account and unrelated data were untouched.

The follow-up above addresses the two-browser functional exchange and separately verifies actual hosted WebSocket events. Strict foreground/background timing and forced network-reconnect browser acceptance remain outstanding. No CAPTCHA, RLS, TLS, or browser security controls were disabled.

Production-backup setup remains parked at the owner's request.
