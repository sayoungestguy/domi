# Threat model: Phase 3 shared shopping list

**Owner:** Domi engineering  
**Last reviewed:** 2026-08-22

## Assets and sensitive data

- Household shopping names, quantities, notes, inventory links, and purchase
  state.
- Household preference for automatic `OUT` addition.
- Member identity and attribution for shopping activity.
- Idempotency keys and optimistic resource versions.

Shopping notes may reveal routines or personal needs. They are household-private
and must not enter logs, metrics, activity metadata, or error tracking context.

## Actors and trust boundaries

- Authenticated household owners and members are trusted to collaborate within
  their own household.
- Authenticated non-members and unauthenticated clients are outside the
  household boundary.
- Mobile input and identifiers are untrusted at the Rails API boundary.
- PostgreSQL constraints are the final boundary for uniqueness and references.

## Data flows

The mobile app sends authenticated JSON to household-scoped shopping endpoints.
Controllers allowlist input and resolve the household through the current user.
Domain commands authorize membership, lock mutable entries, validate versions,
write entries and controlled activity metadata transactionally, and serialize a
stable public shape. Notes stay in `shopping_entries` and responses only.

## Threats and controls

| Threat | Impact | Control | Verification |
|---|---|---|---|
| Cross-household list or entry access | Private data disclosure or modification | Resolve household from current membership, then entries from its active list | Integration denial tests |
| Retried create duplicates an entry | Unreliable list and accidental repeated purchases | Required list-scoped idempotency key with unique database index | Repeated-request integration test |
| Concurrent linked creates duplicate an inventory need | Duplicate purchases | Partial unique index on active list and linked inventory item; conflict recovery in command | Linked duplicate test and database constraint |
| Lost update during concurrent edits | One member silently overwrites another | Row lock, `lock_version`, required `If-Match`, stable `409` | Stale-version integration test |
| Toggle retry reverses purchase state | Incorrect list state | State-setting `purchased: boolean` command | Check/uncheck integration test |
| Cross-household inventory link | Identifier probing or data linkage | Inventory item resolved through household inventory scope plus model validation | Cross-boundary model and request tests |
| Note leakage | Exposure of routines or sensitive needs | Parameter filtering; no note in activity metadata, structured logs, or telemetry | Code review and request-filter configuration |
| Preference tampering | Unexpected automatic list additions | Authenticated household membership and controlled boolean input | Request integration test |
| Oversized or invalid input | Resource exhaustion or malformed state | Length/numeric model checks and database quantity constraint | Validation and constraint tests |

## Abuse and recovery

Authentication rate limits and session revocation from Phase 1 remain in force.
Soft-removed entries and controlled activities preserve who changed material
shopping state. A member can uncheck an incorrectly checked entry or remove an
unwanted entry. Version conflicts cause a refetch rather than an automatic
overwrite. Incident review can use IDs and bounded action metadata without
reading shopping notes.

## Residual risks and follow-ups

- Phase 3 refetches after writes but does not yet meet realtime propagation;
  Phase 5 adds authorized channels and reconnection convergence.
- Phase 4 must threat-model trip-completion idempotency and transaction locking
  before checked entries become immutable purchase history.
- The mobile client does not queue offline writes; this avoids hidden divergence
  but requires an explicit retry after connectivity returns.
