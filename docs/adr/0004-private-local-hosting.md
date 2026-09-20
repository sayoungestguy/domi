# ADR 0004: Private local-machine hosting

**Status:** Accepted
**Date:** 2026-08-30

## Context

Domi's owner does not want the server deployed on the internet. The mobile app
still needs a stable source of truth for a small trusted household, and the MVP
needs repeatable backup, recovery, and upgrade behavior.

## Decision

Run the production Rails image, Solid adapters, and PostgreSQL through Docker
Compose on the owner's local machine. Bind the API to loopback by default and
allow an explicit exact private LAN address for physical devices. Never publish
PostgreSQL, configure router port forwarding, or create public DNS/tunnels.

Build releases from the tested local checkout. GitHub Actions validates but does
not deploy or publish the runtime image. The operator creates PostgreSQL
custom-format backups and stores verified copies on an encrypted off-host disk.

## Consequences

- The owner controls data location and operating cost.
- The service is unavailable when the host or home network is down.
- Remote access is not supported.
- Host patching, firewall rules, backups, and restore drills are operator duties.
- Private LAN HTTP is an accepted exception; public hosting would require a new
  ADR, TLS, public threat review, and production secrets design.
- Optional outbound notification services require a separate consent and
  privacy decision; they never imply inbound access to the Domi server.
