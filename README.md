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

The mobile foundation displays whether it can reach
`http://localhost:3000/api/v1/health`. Android Emulator defaults to
`http://10.0.2.2:3000`; override with `EXPO_PUBLIC_API_URL` when using a physical
device.

Run all local quality checks with:

```sh
bin/check
```

Do not add production services merely because a reserved directory exists.
