# Playwright end-to-end test plan

**Status:** Baseline implemented; browser-matrix and extended cases remain
**Scope baseline:** Phases 0–5

## Purpose and boundary

Playwright exercises the Expo web build against a real Rails API,
PostgreSQL, background worker, and Action Cable endpoint. It is the browser E2E
layer for Domi's completed vertical slices; it does not replace Rails integration
tests, Jest component tests, or physical iOS/Android acceptance.

Playwright browser contexts are a good match for two household members because
they provide isolated cookies and browser storage. Current Playwright also
supports WebSocket routing, failure traces, and multiple browser projects. See
the official documentation for [browser isolation](https://playwright.dev/docs/browser-contexts),
[WebSocket routing](https://playwright.dev/docs/api/class-browsercontext#browser-context-route-web-socket),
and [trace-based CI debugging](https://playwright.dev/docs/best-practices#debugging-on-ci).

## Implemented test package

`apps/e2e` is an isolated npm package:

```text
apps/e2e/
  package.json
  playwright.config.ts
  fixtures/domi.ts
  pages/
    inventory.page.ts
    shopping.page.ts
  specs/
    smoke-accessibility.spec.ts
    auth.spec.ts
    product-loop.spec.ts
    realtime-resilience.spec.ts
    authorization.spec.ts
  scripts/users.ts
```

Use TypeScript, role/label/test-id locators, and user-visible assertions. Page
objects contain selectors and interaction vocabulary only; assertions and
business intent remain readable in spec files.

## Environment and deterministic data

The E2E environment runs the same services as UAT but uses an isolated test
database:

1. `bin/e2e-api` builds the API image, starts PostgreSQL, migrates the dedicated
   `domi_e2e` database, and serves HTTP plus `/cable` on port 3100.
2. Expo serves the web client on port 8082 with its API URL set to the E2E API.
3. Accounts needed only as setup are created by an out-of-process Rails runner;
   no fixture route is added to the application.
4. The authentication scenario uses the real registration API and parses
   development file-delivered verification/reset mail without weakening the
   production endpoint.

Each test creates unique users/households and is order-independent. Begin with
one worker until database isolation is proven; then assign a database/schema or
unique namespace per worker before enabling parallel execution. Generated
authentication state belongs under the Playwright output directory and is never
committed; Playwright warns that saved state can contain impersonation material
([authentication guidance](https://playwright.dev/docs/auth)).

## Required scenarios

| Area | Critical scenario | Main evidence |
|---|---|---|
| Phase 0 platform | Health endpoint and Expo shell load | Visible app shell and successful API health response |
| Phase 1 identity | Register, verify, sign in/out, refresh, request/reset password | Session survives reload; invalid/expired tokens fail visibly |
| Phase 1 household | Owner creates household, invites second user, member joins, both see membership | Two isolated browser contexts share only the intended household |
| Phase 2 inventory | Create/category/edit/status/search/archive/restore | Attention summary and activity agree with authoritative state |
| Phase 2 conflict/cache | Two members edit one version; losing edit receives conflict; offline reload shows labelled last-known data | No silent overwrite; cached data is never presented as current |
| Phase 3 shopping | Manual entry, inventory-linked add/auto-add, edit/check/uncheck/remove | One active household list converges in both contexts |
| Phase 4 completion | Check a subset, finish with restock on/off, preserve unchecked, inspect immutable trip | Full Notice → Out → Add → Purchase → Finish → Restock loop |
| Phase 4 retry | Abort completion response after server commit, retry same idempotency key | Exactly one trip/activity and no duplicate cleanup |
| Phase 5 realtime | Change inventory/list/trip in context A | Context B reflects it within one second under normal local conditions |
| Phase 5 reconnect | Block `/cable`, commit several changes, restore the socket | Gap/reconnect refetch converges inventory, list, trip, and activity state |
| Phase 5 foreground analogue | Hide/show or trigger the web visibility/active path after missed changes | Realtime-state cursor advances and all reads refresh |
| Authorization | Substitute outsider household IDs across every API family and cable subscription | `404`/rejection and no leaked names/counts/events |
| Accessibility | Keyboard-only core loop and axe scan of auth/household/inventory/shopping states | No serious/critical automated violations; logical focus order |

The accessibility scan should use `@axe-core/playwright`, while retaining manual
coverage because automated scans cannot find every accessibility problem, as the
[official accessibility guide](https://playwright.dev/docs/accessibility-testing)
notes.

## Implemented baseline

The Chromium suite currently automates:

- API health, Expo shell, change-time validation, and WCAG A/AA axe scanning;
- registration, file-mail verification, sign-out/sign-in, and password reset;
- two-context household creation, invitation, join, and membership visibility;
- inventory category/create/edit, optimistic conflict, status, search,
  archive/restore, activity refresh, and realtime propagation;
- shopping preference, automatic linked addition, manual add/edit/check/uncheck/
  remove, subset completion, restock, immutable history, and idempotent retry
  after deliberately losing a committed response;
- a deliberately dropped cable event followed by gap-driven authoritative
  convergence and a visibly stale offline shopping cache; and
- outsider denial over both REST and an actual Action Cable subscription.

Run it from the repository root with `npm run e2e`. Install browser binaries once
with `npm run e2e:install`. Set `E2E_ALL_BROWSERS=1` to add the configured WebKit
project after its browser runtime is installed.

## Realtime and failure injection

- Create both member contexts before either page so socket interception is
  configured before the WebSocket opens.
- Use `browserContext.routeWebSocket()` to delay, drop, or disconnect `/cable`
  traffic. Use normal request routing to abort selected REST responses.
- Assert eventual visible state, not the presence of a particular internal
  message. Separately query the API to prove the mutation committed while cable
  delivery was unavailable.
- Measure the normal propagation assertion from the initiating API response to
  the second context's visible update; target less than 1,000 ms locally/UAT.
- For sequence-gap coverage, suppress one event, allow a later event, then assert
  a full authoritative refresh rather than attempting to replay the missing
  payload.
- Run the outbox retry scenario with a test-only publisher failure switch or a
  stopped worker, then restore delivery and assert one visible final state.

## Browser matrix

- Pull requests: Chromium desktop, all critical scenarios.
- Main/nightly: Chromium plus WebKit for the critical product loop, auth, and
  realtime/reconnect scenarios.
- Before beta: add Firefox if Expo web support is part of the product commitment.
- Use one mobile-sized browser viewport as a layout regression project, while
  recognizing that it is still a web browser, not React Native on a device.

## Native acceptance not covered by Playwright

Keep a separate two-device checklist for SecureStore persistence, custom and
universal links, iOS/Android lifecycle transitions, airplane mode/radio changes,
native VoiceOver/TalkBack, push notifications, and physical-device cable latency.
If native automation becomes necessary, evaluate Maestro or Detox in a separate
decision; do not make browser tests pretend to certify native behavior.

## CI and evidence

- Run E2E only after backend CI and the mobile web export pass.
- Use zero retries locally and at most one retry in CI. A retry that passes is
  reported as flaky and does not silently erase the first failure.
- Capture screenshots only on failure, traces on first retry, and retain the HTML
  report as a CI artifact. Playwright recommends traces for CI debugging rather
  than recording every run.
- Fail the required check on any failed or flaky critical test until the cause is
  classified and fixed; no arbitrary sleeps are allowed.
- Publish duration, failure, retry/flaky, and the Phase 5 propagation percentile
  in the test report.

## Implementation sequence and completion criteria

1. [x] Add `apps/e2e`, service orchestration, and deterministic fixture provisioning.
2. [x] Automate smoke/auth/household and the Phase 2–4 golden product loop.
3. [x] Add authorization, optimistic-conflict, and idempotent-retry tests.
4. [x] Add realtime propagation, message loss, gap recovery, and convergence.
5. [ ] Add a mobile-sized project and expand signed-in accessibility scans.
6. [ ] Make Chromium a required pull-request check and add WebKit nightly.
7. [ ] Add a controlled worker/outbox outage scenario in CI/UAT.

The plan is complete when every required scenario maps to an automated spec or
an explicitly owned native checklist, the suite is repeatable from a clean
checkout, failure artifacts are retained, and the Phase 5 one-second/convergence
criteria have reproducible UAT evidence.
