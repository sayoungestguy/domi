# Threat model: Phase 5 realtime and resilience

**Status:** Accepted for implementation
**Date:** 2026-08-29

## Protected assets and invariants

- Only current members receive a household's invalidation stream.
- Cable messages reveal no household content beyond opaque identifiers and
  mutation metadata.
- A cable or worker failure cannot affect an already committed domain mutation.
- Clients always treat the authorized API and PostgreSQL state as authoritative.
- Household sequences increase monotonically and do not cross households.
- Access tokens do not appear in WebSocket URLs or application logs.

## Trust boundaries

- The client-provided access token, household identifier, cursor, and received
  event are untrusted.
- Rails access-token verification and membership-scoped lookup are the cable
  authorization boundary.
- PostgreSQL transactions, constraints, and row locks are the durability and
  ordering boundary.
- Action Cable, Solid Cable, and Solid Queue are delivery mechanisms and may
  delay, duplicate, or fail delivery.
- Persisted AsyncStorage reads are an untrusted convenience cache; credentials
  remain in SecureStore.

## Threats and controls

| Threat | Control | Verification |
|---|---|---|
| Outsider subscribes by guessing a household ID | Channel authenticates the access token and scopes household lookup through the user's memberships | Channel tests reject outsiders and expired sessions |
| Cross-origin site opens an authenticated cable | Request-forgery protection remains enabled; local/private development and explicit production origins are allowlisted | Configuration review and UAT handshake checks |
| Credentials leak in URLs or logs | Token is carried in the subscription frame, URL contains no credential, and token parameters are filtered | Mobile subscription test and configuration review |
| Realtime payload leaks names, notes, or shopping contents | Event is a minimal invalidation envelope with opaque subject identity and version | Publisher payload assertions and schema review |
| Cable failure rolls back or blocks a write | Outbox row commits with domain state; publishing occurs only after commit | Failure/retry integration test asserts durable domain state |
| Lost enqueue strands an event | Periodic dispatcher re-enqueues due unpublished rows | Dispatcher integration test |
| Duplicate or reordered delivery corrupts state | At-least-once messages only invalidate; cursor ignores old events and gaps trigger API refetch | Cursor unit tests and publisher duplicate-safety test |
| Client forges or edits cached state | Cache is never written to the API implicitly; successful refetch replaces it and offline UI is labelled | Mobile cache behavior tests |
| Revoked membership keeps receiving indefinitely | Every new subscription rechecks membership; short-lived access expiry and reconnect force reauthorization | Rejection tests; UAT membership-revocation scenario |
| Outbox grows without bound or exposes history | Events contain minimal metadata; retention/cleanup must be introduced before sustained production use | Phase 6 operations checklist |
| Retry storm overloads the API/cable | Bounded exponential event backoff and five-second batch recovery | Failure timing assertion and load test follow-up |

## Residual risks and follow-ups

- Existing WebSocket connections are not actively disconnected at the instant a
  membership is removed. Phase 6 should broadcast revocation or periodically
  reauthorize long-lived subscriptions; events remain content-free meanwhile.
- At-least-once publication can broadcast immediately before a database failure
  records `published_at`. Client deduplication and authoritative refetch make the
  retry safe, but delivery is not exactly once.
- AsyncStorage is not confidential storage. Cached household reads must be
  cleared at sign-out and unauthorized-session handling, and highly sensitive
  fields must not be added without a new storage review.
- Automated browser checks cannot prove native SecureStore, OS backgrounding,
  native screen-reader, or physical-network behavior. Those remain device/UAT
  acceptance items.
