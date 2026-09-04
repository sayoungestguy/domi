# Domi browser E2E

Playwright drives the Expo web client against a real Dockerized Rails API,
Action Cable, and the dedicated `domi_e2e` PostgreSQL database.

From the repository root:

```sh
npm run e2e:install
npm run e2e
```

The default required project is Chromium. Run the configured Chromium and
WebKit projects with:

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
multi-user product loops.

Playwright covers browser behavior only. Native SecureStore, OS lifecycle,
custom/universal links, VoiceOver/TalkBack, and physical-network behavior remain
part of the device/UAT checklist.
