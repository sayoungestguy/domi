# Phase 4 — Complete the shopping loop

**Status:** Implemented; manual acceptance pending
**Started:** 2026-08-25

## Outcome

A household can turn checked shopping entries into one durable trip, optionally
return linked inventory to `OK`, and safely retry a completion request without
duplicating history or losing list state.

## Included

- A confirmation step that states how many checked entries will be completed.
- An explicit choice to restock linked inventory items.
- Immutable shopping-trip and purchased-item snapshots.
- Preservation of every unchecked entry on the active list.
- One grouped activity record for each completed trip.
- A required idempotency key scoped to the household's shopping list.
- Row locking and one database transaction for snapshots, list cleanup,
  inventory updates, and activity.
- Failure feedback that leaves the completion action available for a safe retry.
- The 20 most recent household trips, newest first.

## Excluded

- Realtime trip propagation and reconnect convergence (Phase 5).
- Editing or deleting completed trips.
- Prices, totals, receipts, store metadata, and analytics.
- Offline completion queues.
- Changing quantities while completing a trip.

## Data and API decisions

- `shopping_trips` stores the actor, completion choice, summary counts,
  completion time, and idempotency key. Its list/key pair is unique.
- `shopping_trip_items` stores immutable name, quantity, note, checked-time,
  inventory link, source-entry link, and whether Domi changed that inventory
  item to `OK`.
- A source entry can appear in at most one completed trip.
- Completing shopping soft-removes checked entries using `removed_at`; unchecked
  entries remain active and unchanged.
- The command locks the shopping list before checking its idempotency key and
  selecting checked entries. It locks selected entries and each inventory item
  before updating them.
- Reusing a successful idempotency key returns the original trip and its current
  active list, even if the retry body differs.
- Completion with no checked entries is rejected without creating history.
- Trip records and snapshots reject application-level updates after creation.

## API contract

- `POST /api/v1/households/{householdId}/shopping-list/complete`
  - Requires `Idempotency-Key`.
  - Requires `restockInventoryItems: boolean`.
  - Returns `201` for the first commit and `200` for a successful replay.
  - Returns both the immutable trip and refreshed active list.
- `GET /api/v1/households/{householdId}/shopping-trips`
  - Returns at most 20 trips in reverse chronological order.

The public OpenAPI contract is version 1.4.0. Security analysis is in
`../security/PHASE_4_THREAT_MODEL.md`.

## Acceptance and exit criteria

- [x] Repeating a successful completion cannot create another trip, snapshot,
  activity, cleanup, or restock update.
- [x] Trip creation, snapshots, checked-entry cleanup, optional restocking, and
  grouped activity commit atomically.
- [x] An injected failure rolls every part of the completion back.
- [x] Unchecked active entries are preserved.
- [x] History is immutable and accessible only to household members.
- [x] The mobile confirmation clearly communicates item count, preservation of
  unchecked entries, and the selected restock behavior.
- [x] API integration, backend CI, mobile behavior, type, lint, and production
  bundle checks pass.
- [x] The complete loop passes automated end-to-end acceptance:

```text
Notice → Mark low/out → Add to shopping → Purchase → Finish → Restock
```

- [ ] Complete the loop with two real members on physical devices, including a
  failed-network retry and both restock choices.

Completion of the remaining manual criterion produces the first usable alpha.

## Demo

1. Maya marks Milk `OUT` and adds it to shopping.
2. Alex checks Milk and a manual Bread entry, leaving Coffee unchecked.
3. Alex chooses to restock linked inventory and confirms completion.
4. One trip contains immutable Milk and Bread snapshots; Milk becomes `OK`.
5. Coffee remains on the active list.
6. Retrying the same completion returns that trip without any additional writes.
