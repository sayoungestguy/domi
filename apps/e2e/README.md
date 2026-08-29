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

Playwright covers browser behavior only. Native SecureStore, OS lifecycle,
custom/universal links, VoiceOver/TalkBack, and physical-network behavior remain
part of the device/UAT checklist.
