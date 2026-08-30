# Domi

> Your home, organised.

Domi is a shared household inventory and shopping application. The MVP gives a
household one reliable place to record what it has, what is running low, and
what needs to be bought.

## Repository map

```text
apps/
  mobile/        React Native client (MVP)
  web/           Vue management client (post-MVP)
services/
  api/           Rails modular monolith and system of record
  realtime/      Reserved for a separately justified realtime service
  integrations/  Reserved for third-party integrations
  analytics/     Reserved for batch analytics and forecasting
packages/
  contracts/     API schemas and generated client types
  design-tokens/ Shared platform-agnostic design tokens
infrastructure/  Local and deployment infrastructure
docs/            Product, architecture, design, and engineering decisions
```

Only `apps/mobile` and `services/api` are required for the MVP. Reserved
directories make likely boundaries visible without committing the product to
microservices prematurely.

## Documentation

- [Product requirements](docs/PRD.md)
- [Development phases](docs/DEVELOPMENT_PHASES.md)
- [System architecture](docs/ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Technical design](docs/TECHNICAL_DESIGN.md)
- [Playwright E2E plan](docs/testing/PLAYWRIGHT_E2E_PLAN.md)
- [CI/CD operating guide](docs/operations/CI_CD.md)

## Local development target

- Ruby 3.4.10 and Rails 8.1.3.1 API
- PostgreSQL 18.3
- Expo SDK 57 / React Native 0.86 mobile application
- Node 24.18.0 LTS and npm 11.19
- Rails Solid adapters; Redis only when measurements justify it

## Start locally

Docker supplies the pinned Ruby/PostgreSQL environment so the system Ruby is not
modified. Node should match `.node-version`.

```sh
bin/setup
bin/dev
```

The mobile app supports account, shared-household, household inventory, shared
shopping, and completed-trip history against `http://localhost:3000/api/v1`. Inventory includes
categories, search, `OK`/`LOW`/`OUT`, attention summaries, activity,
archive/restore, version conflicts, and last-known offline reads. Checked
shopping entries can be completed atomically, with an explicit option to mark
linked inventory `OK`. Household changes are delivered as authorized realtime
invalidations; reconnecting and foregrounded clients refetch authoritative state,
and shopping reads remain visibly available from a last-known offline cache.
Android Emulator defaults to
`http://10.0.2.2:3000`; override with `EXPO_PUBLIC_API_URL` when using a physical
device. In development, verification and password-reset emails are written to
`services/api/tmp/mail`.

Run all local quality checks with:

```sh
bin/check
```

Install the Playwright browsers once, then run the isolated browser E2E suite:

```sh
npm run e2e:install
npm run e2e
```

The suite starts an Expo web server and a Dockerized Rails API backed by the
dedicated `domi_e2e` PostgreSQL database. It does not modify development data.

GitHub Actions runs the backend, mobile, production-image, and Playwright gates
for pull requests and `main`. The production API is built and operated privately
on the owner's local machine; CI does not deploy it or publish a runtime image.

Do not add production services merely because a reserved directory exists.
