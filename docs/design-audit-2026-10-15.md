# Withly design polish audit — 15 October 2026

## Status

Local design preview verified. No commit, push, deployment, production data change, or production configuration change was performed in this pass.

## Changes in this pass

- Extended the approved violet/periwinkle/white Shared Seat identity to public Explore, public request details, 404 and error boundaries.
- Added a keyboard-visible Skip to content link and focusable main content targets across the page shells.
- Corrected low-contrast composer hints, profile progress labels and information-page navigation labels.
- Removed auth-control opacity interpolation that briefly reduced contrast during hydration.
- Added explicit main headings on public pages and removed duplicated Withly suffixes from legal and safety metadata titles.
- Replaced five legacy loading layouts with a shared, labelled status skeleton without motion.
- Added persistent accessibility, keyboard navigation and narrow/landscape reflow regression tests. Added axe-core 4.11.1 as an explicit development dependency.
- Preserved existing navigation destinations, sign-in next parameters, request data projections and preview safeguards.

## Verification

- `fnm exec --using=24 npm run lint`: passed, zero warnings.
- `fnm exec --using=24 npm run test:unit`: 23 passed.
- `fnm exec --using=24 npm run test:e2e`: production-mode test build and TypeScript checks passed; 94 Chromium tests passed.
- A subsequent run with `--skip-build` also passed all 94 tests after disabling animations during screenshot capture.
- `git diff --check`: passed.
- axe-core WCAG 2 A/AA and 2.1 AA tagged scans: zero reported violations on 20 routes at 360px and 1440px.
- Reflow checks: 12 routes at 320px portrait and 667px landscape, without document horizontal overflow.
- Keyboard checks cover skip-to-content on seven routes, request filtering and auth-mode switching.
- Public Explore and 404 screenshots were visually inspected; the refreshed local Explore page was also verified in the in-app browser.

Test execution strips Supabase, Turnstile and push credentials and uses local sample data. Screenshots are generated under `test-results/polish-explore.png` and `test-results/polish-404.png` (test artifacts, not source assets).

## Limits and required follow-up

This is not a WCAG certification or a production readiness certification. Automated scans do not establish full screen-reader usability or coverage of every hidden/interactive state. Safari/Firefox, actual mobile devices, restricted admin screens, live authenticated workflows, real CAPTCHA/email delivery, and forced runtime error-boundary behavior were not verified in this pass.

The read-only production dependency audit flagged three high-severity package entries: Next.js, sharp and source-map-js. The registry audit reported fixes available (Next.js 16.3.8, sharp 0.35.5 and source-map-js 1.2.2). These are audit findings, not proof that the deployed app is exploitable. Resolve the advisories in a dedicated dependency-update pass and repeat regression testing before deployment; no broad automatic dependency fix was applied here.

Representative advisory identifiers: Next.js GHSA-cjq9-62q9-8jv4, sharp GHSA-wq5f-xc86-pv6w, source-map-js GHSA-68fv-2mgg-jv7q. Recheck current registry guidance when performing the update rather than treating this snapshot as permanent.

## Security follow-up — same day

The subsequent security pass upgraded Next.js and its ESLint configuration to 16.3.8, sharp to 0.35.5 (bundled librsvg 2.63.2), and source-map-js to 1.2.2. The production dependency audit now reports zero known vulnerabilities. Lint, 23 unit tests, the production-mode test build, all 94 Chromium tests and a native sharp image-processing smoke test passed again. The design findings and coverage limitations above remain applicable.

The full audit still reports five development-only entries tracing to one upstream `braces` stack-exhaustion advisory (GHSA-vfj7-8cjw-p6xm), via micromatch, fast-glob and the Next.js ESLint plugin/configuration. The registry currently lists 3.0.3 as the latest braces release, which is affected. npm's suggested forced fix would downgrade the Next.js lint configuration to 14.2.35; that incompatible downgrade was not applied. This remaining development-tooling advisory is not included in the production dependency tree and should be revisited when an upstream fix is available.
