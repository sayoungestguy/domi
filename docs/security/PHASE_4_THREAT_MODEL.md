# Threat model: Phase 4 shopping completion

**Status:** Accepted for implementation
**Date:** 2026-08-25

## Protected assets and invariants

- A household sees only its own trip history.
- A checked entry is captured by at most one trip.
- A completion request produces at most one trip for its idempotency key.
- Trip snapshots, list cleanup, inventory restocking, and grouped activity are
  one atomic state transition.
- Historical snapshots cannot be rewritten through application models or APIs.
- Unchecked entries are not removed by completion.

## Trust boundaries

- The mobile client supplies an untrusted household identifier, idempotency key,
  and restock choice.
- Rails authentication and household membership are the authorization boundary.
- PostgreSQL constraints, row locks, and transactions are the consistency
  boundary; client state is never authoritative.

## Threats and controls

| Threat | Control | Verification |
|---|---|---|
| Cross-household completion or history access | Household lookup is scoped through the authenticated user's memberships | Integration tests replace household identifiers with an outsider's identifier |
| Network retry creates duplicate trips | Unique list/idempotency-key index and idempotency lookup under the list row lock | Repeat the request and assert one trip, activity, and set of snapshots |
| Concurrent completion captures an entry twice | List and selected-entry row locks plus a unique source-entry index | Database constraint and completion integration tests |
| Partial failure leaves inventory or list corrupted | One database transaction contains every state change | Inject failure at the final activity write and assert full rollback |
| Client silently restocks inventory | Completion requires an explicit boolean and mobile confirmation names the choice | Contract and mobile behavior tests |
| History changes when source data changes | Purchased fields are copied into immutable snapshot rows | Serializer and read-only model tests |
| Sensitive notes leak into activity text | Grouped activity stores counts only; item notes remain in authorized trip history | Serializer assertions and code review |
| A forged inventory link changes another household | Existing entry constraints plus household reference validation on snapshots | Model/database validation coverage |

## Residual risks and follow-ups

- Application-level read-only records do not prevent a privileged database
  operator from changing history; database access remains tightly restricted and
  audited operationally.
- Phase 5 must publish completion only after commit and make clients refetch the
  authoritative list and history.
- Offline completion remains unsupported; the UI must show failure and allow a
  deliberate retry with the same in-memory idempotency key.
