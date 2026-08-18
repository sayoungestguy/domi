# ADR 0002: Pin the Phase 0 toolchain

- **Status:** Accepted
- **Date:** 2026-08-19

## Context

The development machine has Node 26 and an obsolete system Ruby 2.6. Domi needs
a supported, reproducible toolchain that does not modify operating-system Ruby.
The mobile application should retain access to native functionality without
requiring native projects before it needs custom native code.

## Decision

- Ruby 3.4.10 and Rails 8.1.3.1 for the API.
- PostgreSQL 18.3 for local development.
- Node 24.18.0 LTS with npm 11.19 for JavaScript tooling.
- Expo SDK 57, React Native 0.86, and TypeScript for mobile.
- Expo managed/prebuild workflow; native directories are generated only when a
  capability requires them.
- Docker Compose supplies the Ruby/PostgreSQL development environment. Tool
  version files also support developers who prefer local version managers.
- Rails Solid adapters use PostgreSQL for the initial cache, queue, and cable
  persistence. Redis is deferred until measurements justify it.

## Consequences

Developers can run the API without changing system Ruby. Docker is required for
the documented default API workflow, while native simulators still require the
platform SDKs. Dependency versions are committed in lockfiles. Framework upgrades
are explicit pull requests with contract, build, and device verification.

