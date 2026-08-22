# Phase 3 — Shared shopping list

**Status:** Implemented; manual acceptance pending  
**Started:** 2026-08-22

## Outcome

Every member of a household can build and use one authoritative shopping list,
connect needs to inventory, and check items off quickly without creating
duplicates when a request is retried.

## Included

- One lazily created active shopping list per household.
- Manual entries with optional quantity and note.
- Inventory-linked entries and quick addition of current `OUT` items.
- A prompt when inventory becomes `OUT`, or automatic addition through a
  household preference.
- Duplicate prevention for active entries linked to the same inventory item.
- Idempotent entry creation through a required `Idempotency-Key`.
- Edit, check, uncheck, and soft remove actions with actor attribution.
- Optimistic versions and stable conflict responses for every entry mutation.
- A one-handed shopping mode with large checkbox targets, remaining count,
  purchased section, large-text-safe rows, and explicit screen-reader state.
- Loading, empty, error, permission-denied, and conflict recovery behavior.

## Excluded

- Trip completion, purchased-item history, and linked inventory restocking
  (Phase 4).
- Realtime propagation and reconnect convergence within one second (Phase 5).
- Durable offline writes and mutation queues.
- Multiple named lists, list sharing outside a household, prices, store aisles,
  barcode scanning, and item ordering.

## Data and API decisions

- `shopping_lists.household_id` is unique, enforcing one active MVP list.
- Shopping entries use soft removal so activity attribution and future trip
  history can retain references.
- A partial unique index permits only one non-removed entry for each linked
  inventory item on a list.
- Idempotency keys are unique within a shopping list. Repeating a create request
  returns its original entry instead of creating another row.
- `lock_version` is serialized as `version`; mutations require `If-Match` and
  stale writes return `shopping.version_conflict`.
- Check/uncheck is an explicit `purchased: boolean` assignment, never a toggle.
- The inventory domain calls the public
  `Shopping::EnsureEntryForInventoryItem` command when automatic addition is
  enabled. The command is duplicate-safe inside the inventory transaction.
- Notes are not included in activity metadata or human-readable activity text.

The public contract is version 1.3.0 in
`../../packages/contracts/openapi.yaml`. Security analysis is in
`../security/PHASE_3_THREAT_MODEL.md`.

## Acceptance and exit criteria

- [x] Two members contribute to one authoritative household list.
- [x] Retried manual and linked creates cannot create duplicate entries.
- [x] Concurrent stale edits receive a stable conflict and authoritative version.
- [x] Check and uncheck use idempotent state-setting commands.
- [x] Cross-household list and entry identifiers are denied.
- [x] `OUT` transitions prompt or automatically add according to preference.
- [x] Database constraints protect list ownership, linked duplicates, quantity,
  and references.
- [x] Shopping mode exposes a remaining count, purchased section, 64-point rows,
  and checkbox semantics.
- [x] Complete Rails integration, contract, and mobile quality gates.
- [ ] Complete a manual two-member, one-handed, screen-reader, and 200% text
  walkthrough on physical devices.

## Demo

1. Maya adds Bread manually; retrying the same request returns the same entry.
2. Alex marks Milk `OUT` and accepts the prompt to add its linked entry.
3. The household enables automatic addition and marking Soap `OUT` adds it once.
4. Maya checks Bread; it moves to Purchased and the remaining count decreases.
5. Alex unchecks Bread, edits its note, and both changes show Alex as updater.
6. A stale edit conflicts and the mobile client refetches the authoritative list.

## Follow-ups

- Phase 4 completes a trip atomically and optionally restocks linked inventory.
- Phase 5 adds household realtime invalidation and reconnect convergence.
- A later evidence-led phase may add offline shopping mutations with visible
  recovery rather than silently queuing them.
