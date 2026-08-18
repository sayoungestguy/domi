# Domi Technical Design

**Scope:** MVP implementation conventions  
**Applies to:** mobile client, Rails API, shared contracts, tests, and delivery

## 1. Engineering approach

Build vertical slices through a modular monolith. Keep framework concerns at the
edges and business rules in explicit domain operations. Prefer conventional,
observable code over abstraction introduced for hypothetical reuse.

Core rules:

- PostgreSQL and the API are authoritative.
- Controllers are transport adapters, not business workflows.
- Models protect local invariants; multi-aggregate workflows use commands.
- Authorization is explicit and household-scoped on every request.
- Side effects run after commit through a transactional outbox.
- Public contracts are versioned and tested.
- A service is extracted only through an accepted ADR.

## 2. Rails application layout

Use a conventional Rails application with domain modules rather than separate
engines or gems initially:

```text
services/api/app/
├── controllers/api/v1/
├── domains/
│   ├── households/
│   ├── inventory/
│   ├── shopping/
│   ├── activity/
│   └── notifications/
├── jobs/
├── models/
├── policies/
├── serializers/
└── channels/
```

Dependency direction is transport → application command/query → domain/data.
Domain code must not depend on controllers or serializers. Cross-domain writes
go through a public command interface rather than another domain's table/model.

### Patterns to use

- **Command object:** one business mutation, for example
  `Shopping::CompleteTrip` or `Households::AcceptInvitation`.
- **Query object:** reusable or performance-sensitive reads such as the dashboard.
- **Policy:** authorization decision using current user/membership and resource.
- **Serializer/presenter:** stable API shape independent of model internals.
- **Outbox event:** reliable post-commit side effects.
- **Adapter:** push/email/storage providers behind a small owned interface.

Avoid generic “service objects” with unclear semantics, repository wrappers over
Active Record without a real need, callbacks that trigger cross-domain work,
and concerns that hide important dependencies.

## 3. Domain invariants and workflows

### Household authorization

Resolve current membership from the authenticated user and route household ID.
All resource queries start from that household scope. Policies decide whether
the role may perform the operation. Never load a global record first and compare
household IDs afterward.

### Inventory status transition

`Inventory::ChangeStatus` validates membership and version, persists the state,
records activity, and writes an outbox event in one transaction. If status
becomes `out` and auto-add is enabled, it invokes Shopping's idempotent
`EnsureEntryForInventoryItem` command inside the transaction.

### Complete shopping trip

`Shopping::CompleteTrip`:

1. claims/validates an idempotency key;
2. locks the active list and selected entries;
3. creates a trip and immutable purchased-item snapshots;
4. changes linked inventory items to `ok` when requested;
5. marks/removes only entries included in the command;
6. writes grouped activity and outbox events; and
7. commits atomically.

The command returns the same result for a repeated idempotency key. It never
derives completion from a stale client-side “all entries” snapshot.

### Invitations

Generate a cryptographically random secret, return it only in the share URL, and
store its digest. Acceptance locks the invitation, verifies expiry/revocation
and usage, and upserts membership transactionally.

## 4. Data conventions

- UUID primary and foreign keys.
- `created_at`/`updated_at` in UTC; household timezone stored as an IANA name.
- Database `NOT NULL`, foreign keys, checks, and unique indexes mirror invariants.
- Enumerated values use explicit stable strings or database checks; never expose
  framework enum ordinals.
- User-generated removal is normally soft deletion with `archived_at`; legal
  deletion is a distinct, auditable workflow.
- Immutable snapshot fields preserve purchased item name, quantity, and unit even
  if inventory changes later.
- Money, when introduced, uses integer minor units plus ISO currency—not float.

Suggested MVP tables:

```text
users, sessions
households, memberships, invitations, household_preferences
categories, inventory_items
shopping_lists, shopping_entries, shopping_trips, purchased_items
activities, outbox_events, device_tokens, notification_preferences
idempotency_keys
```

Indexes must cover household-scoped list/filter ordering, active memberships,
active shopping entries, outbox processing, and case-insensitive item search.
Validate query plans with representative—not empty—data.

## 5. API conventions

- Base path `/api/v1`; JSON only.
- Resource names are plural kebab-case in URLs and camelCase in JSON unless the
  generated-client toolchain dictates one consistently.
- Pagination is cursor-based for activity and growing lists.
- Timestamps are ISO 8601 UTC strings; IDs are opaque strings.
- Mutation requests send `Idempotency-Key` where retry could duplicate work and
  `If-Match`/version where stale overwrite matters.
- Return `201` for creation, `204` for no-content success, `409` for version or
  invariant conflicts, `422` for semantic validation, and non-enumerating
  `404` for inaccessible household resources.

Error envelope:

```json
{
  "error": {
    "code": "inventory.version_conflict",
    "message": "This item changed on another device.",
    "requestId": "req_...",
    "details": { "currentVersion": 7 }
  }
}
```

Machine codes are stable; messages may be localized. The OpenAPI schema is
validated in CI and breaking changes require a new API version or a documented
compatibility migration.

## 6. Mobile application design

Use feature-first modules with shared platform layers:

```text
apps/mobile/src/
├── app/             navigation, providers, bootstrapping
├── features/
│   ├── auth/
│   ├── households/
│   ├── inventory/
│   └── shopping/
├── components/      shared accessible UI primitives
├── api/             generated contract client and transport
├── storage/         secure and persisted cache adapters
└── telemetry/       logs, errors, performance
```

Feature modules own screens, hooks/use cases, and tests. They may import shared
components and API contracts but not other features' internal files. Export a
small public surface from each feature.

Server state uses a query/cache library with household IDs in every cache key.
Changing household clears or partitions cached data. Forms keep local draft
state. Auth secrets use secure storage; general state must never contain refresh
tokens or other reusable credentials.

Realtime messages update by resource/version or invalidate the relevant query.
On foregrounding/reconnect, refetch critical household state. Use state-setting
commands (`purchased: true`) rather than non-idempotent toggles.

## 7. Security implementation checklist

- Threat-model authentication, invitations, membership changes, shopping-trip
  retries, exports, and deletion before implementation.
- Parameter allowlists and schema validation at API boundaries.
- Brute-force protection and generic auth/reset responses.
- CSRF protection for cookie-based web sessions; mobile uses an appropriate
  token flow with rotation and revocation.
- Secrets come from environment/secret management; `.env` is local only.
- Dependency and static analysis in CI; remediate critical issues before deploy.
- Logs and analytics use IDs and controlled fields, never arbitrary notes or
  tokens.
- Automated tests attempt horizontal and vertical privilege escalation.

## 8. Testing strategy

Favor a test pyramid with high-value integration coverage:

- **Domain/unit:** invariants, policies, commands, conflict and retry behavior.
- **Request/contract:** endpoint status, shape, validation, authorization, and
  OpenAPI conformance.
- **Database:** constraints, transactions, concurrency, outbox claiming.
- **Mobile component:** accessibility semantics, loading/error/offline states.
- **End-to-end:** sign up, create/join household, inventory-to-shopping, concurrent
  list update, complete trip, and cross-household denial.

Use factories/builders that make household ownership explicit. Avoid broad
snapshots for business behavior. Time and external providers are injected or
controlled. Concurrency and idempotency tests must use the real database.

## 9. Quality gates and CI

Every pull request runs formatting, linting, type checking, unit/request tests,
schema/contract validation, migration safety checks, dependency audit, secret
scan, and a production build of affected applications. Main additionally runs
critical end-to-end tests against PostgreSQL.

A change is complete when code, tests, telemetry, accessibility states,
documentation, migration/rollback strategy, and API contract are updated. Avoid
coverage quotas as the sole quality measure; track coverage trends and require
tests around changed behavior.

## 10. Observability in code

Use structured events with names such as `shopping.trip_completed`. Include
request ID, event ID, user ID, household ID, resource ID, duration, result, and
release where appropriate. Do not include item notes or invitation/token values.
Metrics use bounded labels; IDs belong in logs/traces, not metric labels.

Expected failures return typed results/errors that controllers map consistently.
Unexpected errors reach error tracking with filtered context. Jobs declare retry
and discard behavior and surface terminal failure rather than retry forever.

## 11. Migration and release practices

- Keep migrations small, reversible when feasible, and safe for rolling deploys.
- Backfill asynchronously/in batches; do not lock large tables in a deploy step.
- Add nullable column → deploy dual-compatible code → backfill → enforce
  constraint → remove old path later.
- Feature flags protect incomplete user-visible capabilities, not permanent
  branches of business logic.
- Mobile API changes remain backward-compatible for a defined support window
  because installed clients cannot be upgraded instantly.

## 12. Decision records and ownership

Architecture-significant choices use `docs/adr/NNNN-title.md` with context,
decision, alternatives, consequences, and review trigger. The initial ADR records
the modular-monolith choice. Each domain has a named code owner before multiple
teams contribute. Reserved services are not activated without operational
ownership, runbooks, dashboards, and on-call expectations.

