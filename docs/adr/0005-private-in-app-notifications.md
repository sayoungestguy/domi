# ADR 0005 — Private in-app notifications

**Status:** Accepted

## Context

Domi's API is hosted on the owner's local machine and is not publicly reachable.
Native push would introduce Apple, Google, or another provider, device-token
storage, outbound delivery, and an external privacy boundary. The MVP still
needs household members to notice important changes when they open the app.

## Decision

Phase 6 uses a persistent, household-scoped in-app inbox. Notifications are
created for existing members other than the actor when a member joins, a
shopping entry is added, or a shopping trip is completed. Each member controls
the three categories independently. Read state and preferences remain in the
local PostgreSQL database.

No device tokens are collected and no notification payload leaves the local
host. Realtime events prompt connected clients to refresh; disconnected clients
read the persisted inbox on their next local connection.

## Consequences

- Notifications are available only while the client can reach the local host.
- The owner does not need a push-provider account or public callback endpoint.
- Native background alerts are outside the private MVP and require a new ADR,
  explicit consent, redacted payloads, token revocation, and delivery monitoring.
