# Phase 5 — Realtime and resilience

**Status:** Implemented; manual acceptance pending
**Started:** 2026-08-29

## Outcome

Household members receive prompt invalidation messages while connected and
converge on authoritative API state after disconnects, missed messages, token
renewal, or application backgrounding. A realtime outage cannot roll back or
invalidate a committed household operation.

## Included

- One authorized Action Cable stream per household.
- A household-scoped, monotonic sequence on every published domain change.
- A PostgreSQL transactional outbox written in the same transaction as activity.
- Background publication with bounded retry backoff and periodic recovery of
  pending events.
- Duplicate-event suppression and sequence-gap detection on the client.
- Authoritative refetch after connection, reconnection, foregrounding, and a
  detected gap.
- Persisted last-known inventory, shopping-list, and trip reads with an explicit
  stale/offline presentation.
- Existing optimistic-lock versions and `409` conflict responses for mutable
  inventory and shopping resources.

## Excluded

- Offline mutation queues and conflict merging.
- Push notifications (Phase 6).
- A separate Phoenix or Redis realtime service.
- Replaying event payloads as authoritative client state.
- Editing or deleting completed trip history.

## Event and recovery design

Every activity-producing household mutation locks the household sequence and
inserts an `outbox_events` row before its database transaction commits. The
event is an invalidation hint, not a state replica. It contains a schema version,
event ID, household ID, sequence, action/resource, subject identity, and subject
version when available; it deliberately omits household content and notes.

An after-commit job publishes the event through `HouseholdChannel`. A recurring
dispatcher finds due unpublished events so a lost job or temporary cable outage
does not strand a committed change. Publishing is at-least-once: clients ignore
duplicate or older sequences and refetch the API. A gap causes the same
authoritative refetch, so correctness does not depend on retaining every cable
message.

`GET /api/v1/households/{householdId}/realtime-state` returns the server's current
household sequence. Clients compare and persist that cursor on connection and
when the app becomes active.

## Operational configuration

- Development permits Action Cable origins only from loopback, the Android
  emulator host, and RFC1918 private addresses.
- Production keeps same-origin protection by default. Set
  `ACTION_CABLE_ALLOWED_ORIGINS` to a comma-separated allowlist of HTTPS client
  origins when the deployed web client and API do not share an origin.
- Production uses Solid Cable and Solid Queue. The pending-outbox dispatcher
  runs every five seconds.
- Subscription credentials are sent in the Action Cable subscription frame,
  never in the WebSocket URL, and token-like parameters are filtered from logs.

## Acceptance and exit criteria

- [x] Realtime subscription is authorized through both a valid access token and
  current household membership.
- [x] Domain state, activity, sequence advancement, and outbox insertion roll
  back together.
- [x] Publication failure leaves the underlying operation committed and records
  a retryable outbox failure.
- [x] Duplicate publication and client delivery are safe.
- [x] Pending-event recovery, token rejection, household isolation, reconnect,
  foreground refresh, gap detection, and offline shopping reads have automated
  coverage.
- [x] API integration, contract, mobile behavior, type, lint, security, and
  production-build gates pass.
- [ ] With two real devices, a connected update normally appears within one
  second.
- [ ] With one device disconnected, multiple committed changes converge after
  reconnection without losing active-list or trip state.
- [ ] Verify foreground recovery, access-token expiry, and a five-minute cable
  outage in the UAT environment.

The remaining device/UAT checks are explicit release evidence, not prerequisites
for beginning Phase 6 development.

## Demo

1. Maya and Alex open the same household on separate devices.
2. Maya marks Milk `OUT`; Alex sees inventory and activity refresh promptly.
3. Alex disconnects, while Maya adds and completes a shopping entry.
4. Alex reconnects; Domi compares the household sequence and refetches inventory,
   the active list, and completed trips.
5. The outbox publisher is temporarily failed and retried; the mutation remains
   committed and clients converge without showing a duplicate.

Security analysis is in `../security/PHASE_5_THREAT_MODEL.md`. Browser E2E
coverage and native acceptance boundaries are in
`../testing/PLAYWRIGHT_E2E_PLAN.md`.
