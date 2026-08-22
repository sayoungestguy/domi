# Phase 2 — Inventory vertical slice

**Status:** Implemented; manual acceptance pending
**Started:** 2026-08-22

## Outcome

Every member of a household can maintain one authoritative inventory, quickly
see what is low or out, and understand who made each material change.

## Included

- Household-scoped categories and inventory items.
- Item creation and editing with optional quantity, unit, notes, and category.
- Explicit `OK`, `LOW`, and `OUT` state changes.
- Case-insensitive name search and status filtering.
- Non-blocking duplicate-name warnings.
- Soft archive and restore.
- Optimistic versions and conflict responses for every item mutation.
- Attention counts and recent human-readable activity.
- Actor attribution for create, edit, status, archive, and restore actions.
- A household-partitioned mobile read cache with a visible offline/stale state.
- Loading, empty, error, permission-denied, offline-read, and conflict behavior.

## Excluded

- Shopping-list creation and automatic addition of `OUT` items (Phase 3).
- Realtime updates and transactional outbox publication (Phase 5).
- Durable offline writes or conflict merging (Phase 8 entry condition applies).
- Category archive/reordering UI, bulk import, barcode scanning, images, pricing,
  expiry dates, and stock forecasting.

## Data and API decisions

- UUID primary keys and household foreign keys maintain the Phase 1 boundary.
- Inventory names use `citext` for predictable case-insensitive matching, but
  duplicates remain allowed because two physically distinct supplies can share
  a name. The API returns a warning instead of rejecting the write.
- `lock_version` is the public `version`. Mutations send `If-Match`; stale
  versions return `inventory.version_conflict` with the current version.
- User removal is represented by `archived_at`, preserving activity and allowing
  restoration.
- Categories must belong to the same household as an item. The API always loads
  items and categories through the authenticated household scope.
- Activity records store controlled name/status snapshots, never inventory
  notes. Notes are filtered from Rails request logs.
- Mobile cache keys contain the household ID. Cached inventory is read-only
  while offline and is clearly labelled as stale.

The contract is versioned in `../../packages/contracts/openapi.yaml`. Security
analysis is in `../security/PHASE_2_THREAT_MODEL.md`.

## Acceptance and exit criteria

- [x] Two members can read and change the same authoritative inventory.
- [x] Every material inventory action is attributed to its actor.
- [x] Cross-household item and category identifiers are denied.
- [x] Database constraints protect status, quantity, ownership, and references.
- [x] Search, filters, attention summary, warnings, archive, and restore work.
- [x] Stale mutations receive a stable conflict response and current version.
- [x] Mobile loading, empty, error, offline-read, and permission states exist.
- [x] Complete Rails and mobile quality gates.
- [ ] Complete a manual two-member usability walkthrough.

## Demo

1. A member adds Rice with a quantity, unit, note, and Kitchen category.
2. A second member sees it, marks it `LOW`, and both users see attribution.
3. Search and status filters locate it; the dashboard attention count changes.
4. A stale edit receives a conflict and refetches the authoritative value.
5. The item is archived, disappears from the active list, and is restored.
6. With the API unavailable, the last saved inventory remains visible as stale
   and mutations are not falsely queued.

## Follow-ups

- Phase 3 consumes `OUT` inventory through an idempotent shopping command.
- Phase 5 adds realtime invalidation, gap detection, and outbox publication.
- Phase 8 may add durable offline mutation queues only if beta evidence meets its
  documented entry condition.
