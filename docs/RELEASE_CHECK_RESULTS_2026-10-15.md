# Design and dependency security release — 15 October 2026

## Production deployment

The owner explicitly approved releasing the new design and security patches together.

- Project: `a1-04/withly`, `prj_3cTaj7FsdlEDDY6iPksdHYGtLuGu`.
- New deployment: `dpl_89NgLCvgPgQMgQPMzEuk6disC4He`.
- Deployment URL: https://withly-4fhd1ppqo-a1-04.vercel.app
- Live alias: https://withly.in (also https://www.withly.in).
- Vercel reported Ready and the expected production aliases after deployment.
- Vercel's remote build explicitly detected Next.js 16.3.8 and completed successfully.
- Previous production deployment retained: `dpl_GXVNEbGckSrFDpbarh9jKYxF3uRi`, https://withly-m6nhmc0ib-a1-04.vercel.app. Rolling back to it would also restore the older dependency versions.
- Deployment used the local working tree on `codex/playful-landing-design`; it was not a GitHub merge. No commit or push was performed in this pass. The local source changes must be preserved/published separately.

## Dependency changes

| Dependency | Before | After |
| --- | --- | --- |
| Next.js | 16.3.6 | 16.3.8 |
| eslint-config-next | 16.3.6 | 16.3.8 |
| sharp | 0.35.4 | 0.35.5 |
| source-map-js | 1.2.1 | 1.2.2 |

The lockfile includes the matching Next.js native/compiler packages and sharp/libvips platform packages. Local sharp reported bundled librsvg 2.63.2 and passed a native PNG generation smoke test. No forced audit fix or unrelated major upgrade was applied.

`npm audit --omit=dev` reports zero known vulnerabilities for the updated dependency tree. This is a known-advisory scan, not proof of absence of all security flaws.

Full audit: five development-only entries remain, all tracing to the `braces` stack-exhaustion advisory GHSA-vfj7-8cjw-p6xm through the Next.js linting dependency chain. Registry latest braces is 3.0.3 and is affected. npm proposes downgrading the lint configuration to 14.2.35; this incompatible forced downgrade was not applied. Revisit when upstream publishes a compatible fix. Production-only audit is clear.

## Verification

- ESLint: passed with zero warnings.
- Unit tests: 23 passed.
- Local production-mode test build and TypeScript: passed.
- Local Chromium suite: 94 passed, including the design accessibility and responsive checks documented in `design-audit-2026-10-15.md`.
- Native sharp image-processing smoke test: passed.
- `git diff --check`: passed.
- Live production suite: five passed, one skipped.
  - Health returns HTTP 200 and `status: ok`; public landing, Explore, legal and safety routes are available with expected security headers.
  - Unsafe auth callback destinations remain on the application's origin.
  - Anonymous export/maintenance calls are rejected.
  - Missing and invalid CAPTCHA signup requests are rejected.
  - New landing heading, signup consent, monitored support link and challenge container are present.
  - Direct Supabase CAPTCHA boundary check skipped because its public URL/key were not supplied to the test process. Not counted as passed.

The live landing screenshot is generated at `test-results/production-redesign-landing.png`. Preview and live checks do not establish real email delivery, successful CAPTCHA completion, all authenticated multi-user interactions, or full WCAG compliance. No user records were intentionally created or changed, no database migrations were run, and no service secrets or security settings were changed.
