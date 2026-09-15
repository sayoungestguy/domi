# Domi browser E2E

Playwright drives the Expo web client against a real Dockerized Rails API,
Action Cable, and the dedicated `domi_e2e` PostgreSQL database.

From the repository root:

```sh
npm run e2e:install
npm run e2e
```

The default required projects are desktop Chromium plus the phone-sized
Chromium beta-readiness scenario. Add the configured WebKit project with:

```sh
E2E_ALL_BROWSERS=1 npm run e2e
```

Use `E2E_EXTERNAL_SERVERS=1` only when compatible API and Expo web servers are
already running at `E2E_API_URL` and `E2E_WEB_URL`. Generated reports, traces,
screenshots, and videos are ignored by Git.

Run one focused regression while developing with a spec path or title filter:

```sh
npm --prefix apps/e2e test -- specs/form-validation.spec.ts
npm --prefix apps/e2e test -- --grep "notification"
```

The suite includes focused scenarios for inline form feedback, authentication
failure privacy, household role boundaries, destructive-action safeguards,
notification preferences, and request idempotency in addition to the full
multi-user product loops. The beta-readiness scenario scans all signed-in tabs
for WCAG A/AA violations and enforces startup/API regression budgets.

Generate a named desktop and phone-sized catalogue of every application screen
under the repository-root `screenshots/` directory with:

```sh
npm run e2e:screenshots
```

This dedicated evidence run is excluded from the normal regression suite.

Playwright covers browser behavior only. Native SecureStore, OS lifecycle,
custom/universal links, VoiceOver/TalkBack, and physical-network behavior remain
part of the device/UAT checklist.
