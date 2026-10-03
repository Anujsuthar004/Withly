# Two-browser chat acceptance — October 3, 2026

## Outcome

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

## Follow-up required

Cleanup was verified after the run: the temporary account, profile, conversation, messages, and five fixture notifications were removed. The owner's account and unrelated data were untouched.

Reproduce with two simultaneously connected browsers while observing WebSocket subscription/authentication status and transport errors. Distinguish persisted-message reads from actual live delivery. After identifying and addressing the cause, repeat both directions without receiver navigation or reload, and confirm recovery after reconnect. Do not disable CAPTCHA, RLS, TLS, or browser security controls to get a passing result.

Production-backup setup remains parked at the owner's request.
