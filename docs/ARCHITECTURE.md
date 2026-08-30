# Domi System Architecture

**Status:** Proposed MVP architecture  
**Decision theme:** Start as a modular monolith; extract only proven boundaries.

## 1. Architecture goals

- Keep household data consistent and isolated.
- Make the shared shopping experience responsive and near-real-time.
- Support a small team shipping a complete vertical slice.
- Preserve clear domain boundaries without early operational complexity.
- Allow clients and future services to integrate through versioned contracts and
  domain events.

## 2. MVP context

```text
┌──────────────────────────┐
│ React Native mobile app  │
└────────────┬─────────────┘
             │ HTTPS + WebSocket
             ▼
┌──────────────────────────┐
│ Rails modular monolith   │
│ REST API + realtime      │
│ auth, policy, domains    │
└───────┬──────────┬───────┘
        │          │ optional when needed
        ▼          ▼
┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │ Redis/jobs  │
│ source of   │  │ ephemeral   │
│ truth       │  │ workloads   │
└─────────────┘  └─────────────┘
```

The Rails application owns REST endpoints, authorization, domain transactions,
activity creation, and Action Cable channels. This replaces the original plan
to introduce Phoenix for the first realtime use case. Phoenix remains a valid
future extraction only if observed concurrency or operational requirements
justify a separate realtime system.

## 3. Repository structure

```text
domi/
├── apps/
│   ├── mobile/               # React Native; the MVP client
│   └── web/                  # Vue 3 management client, post-MVP
├── services/
│   ├── api/                  # Rails modular monolith
│   ├── realtime/             # reserved extraction point
│   ├── integrations/         # reserved TypeScript service
│   └── analytics/            # reserved Python jobs/models
├── packages/
│   ├── contracts/            # OpenAPI schema/generated types
│   └── design-tokens/        # colour, typography, spacing primitives
├── infrastructure/           # deployment and local infrastructure
└── docs/                     # specifications and ADRs
```

Reserved services contain no runtime until an architecture decision record
(ADR) documents why extraction is needed, who owns it, and how it is operated.

## 4. Domain boundaries

### Identity

Users, credentials, email verification, sessions/tokens, password reset, account
deletion. Authentication identifies a user; it does not grant household access.

### Households

Households, membership, roles, invitations, household preferences, ownership
transfer. It is the authorization boundary for every other MVP domain.

### Inventory

Categories and inventory items, including status transitions and archival.
Inventory may request that Shopping create a linked entry; it does not write
shopping tables directly.

### Shopping

The active list, entries, item completion, purchase/trip records, and inventory
restock coordination. Trip completion is a single database transaction.

### Activity

Human-readable projections of material domain events. The activity feed is not
the source of truth and is not a full event-sourcing log.

### Notifications

User preferences, device tokens, and asynchronous delivery. Domain transactions
record an outbox event; delivery occurs after commit.

## 5. Data architecture

PostgreSQL is authoritative. Every household-owned row contains `household_id`
directly or has an unambiguous parent path to it. Application-level policies are
mandatory; database constraints and indexes provide defence in depth.

Core relationships:

```text
User ──< Membership >── Household
                           ├──< Invitation
                           ├──< InventoryItem
                           ├──1 ActiveShoppingList ──< ShoppingEntry
                           ├──< ShoppingTrip ──< PurchasedItem
                           ├──< Activity
                           └──< OutboxEvent
```

Identifiers are UUIDs. Timestamps are UTC. User-facing time is rendered in the
household timezone. Mutable records carry an integer `lock_version` or an
equivalent version for optimistic concurrency where lost updates matter.

Recommended constraints include unique active membership per user/household,
exactly one owner enforced transactionally, one active shopping list per
household, and one active shopping entry per linked inventory item.

## 6. API and realtime boundary

REST is namespaced under `/api/v1`. Requests and responses use JSON and stable
machine error codes. The OpenAPI document in `packages/contracts` is the public
contract used to generate TypeScript client types.

Representative endpoints:

```text
POST   /api/v1/session
GET    /api/v1/households/:household_id/dashboard
GET    /api/v1/households/:household_id/inventory-items
PATCH  /api/v1/households/:household_id/inventory-items/:id
GET    /api/v1/households/:household_id/shopping-list
POST   /api/v1/households/:household_id/shopping-trips
GET    /api/v1/households/:household_id/activities
```

Clients subscribe to one authorized household channel. Messages contain event
type, household ID, resource ID, resource version, and a cursor—not the entire
private resource. On receipt, clients update a safe local cache or invalidate
and refetch. Reconnection always performs cursor-based catch-up or a full
refetch; WebSocket delivery is an optimization, not the source of truth.

## 7. Consistency and event delivery

- Server writes are authoritative.
- Multi-record business actions use database transactions.
- Mutation endpoints that clients may retry accept an idempotency key.
- An outbox row is committed in the same transaction as the domain change.
- A background job publishes realtime updates, notifications, and analytics
  events from the outbox, retrying safely.
- Consumers deduplicate by event ID.

For ordinary edits, optimistic concurrency detects stale versions and returns a
conflict response with current state. Simple shopping check/uncheck commands
are idempotent state assignments rather than toggle commands.

## 8. Client state and offline behavior

The mobile app separates:

- server state: query cache keyed by household and resource;
- local UI state: forms, navigation, transient filters;
- durable identity: secure platform storage;
- last-known read data: persisted cache for fast startup.

MVP offline mode is read-only with an explicit stale indicator. A durable
offline mutation queue is a later feature because it requires conflict rules,
user-visible recovery, and device testing. Firestore is not required; a future
queue can synchronize directly with the Rails API.

## 9. Security and privacy

- TLS for all network traffic; encrypted provider storage and backups.
- Passwords use the framework's current strong password hashing defaults.
- Access tokens are short-lived and refresh credentials rotate; mobile secrets
  use Keychain/Keystore.
- Each endpoint loads resources through the current membership scope and applies
  an explicit policy. Unauthorized cross-household access returns a
  non-enumerating response.
- Invitation secrets and reset tokens are stored as hashes and expire.
- Rate limits cover authentication, invitation, search, and mutation abuse.
- Logs exclude passwords, tokens, invitation codes, and free-form private text.
- File uploads, when introduced, use private object storage and signed URLs.
- Account/household deletion is asynchronous, auditable, and documented.

## 10. Deployment and operations

The MVP server is hosted on the owner's local machine, not on a public cloud or
internet-facing host. Environments are development, automated test, and a
private production-mode local host. The host binds to loopback by default; an
operator may bind to one explicit private LAN address for physical devices. No
router port forwarding, public DNS, or inbound internet access is required.

Rails, Solid Queue, Solid Cable, and PostgreSQL run through a dedicated Compose
profile. PostgreSQL is not published on a host port. The operator owns encrypted
off-machine backup copies, restore drills, host patching, power availability,
and local firewall rules. Redis remains unnecessary and non-authoritative.

Each deploy runs migrations as a controlled release step. Schema changes follow
expand/migrate/contract so old and new application versions can overlap safely.
Production rollback favors application rollback; destructive schema changes are
delayed until compatibility is proven.

## 11. Observability and reliability

All requests receive a request ID; background work propagates the request and
event IDs. Emit structured logs, request/error rates, p50/p95/p99 latency,
database pool saturation, job age/failures, outbox lag, WebSocket connections,
and notification delivery failures. Error tracking includes release and
environment but filters private household content.

Initial local-host objectives:

- availability while the designated home server is powered on and connected;
- p95 normal API latency below 500 ms;
- p95 connected event propagation below 1 second;
- recovery point objective no worse than 15 minutes;
- recovery time objective within 4 hours.

These are operational goals, not public service commitments. Local power,
network, and hardware failures are accepted constraints and must remain visible
to clients as offline state.

## 12. Evolution triggers

| Capability | Start with | Extract/add when |
|---|---|---|
| Realtime | Rails Action Cable | measured fan-out/concurrency or independent scaling makes it necessary |
| Search | PostgreSQL trigram/full text | relevance, corpus size, or cross-domain indexing exceeds it |
| Cache/jobs | PostgreSQL + Rails basics | latency or asynchronous delivery requires Redis-backed jobs/cache |
| Integrations | Rails adapters/jobs | release cadence, failure isolation, or ownership justifies a TypeScript service |
| Analytics | operational events/SQL | product decisions need durable cross-domain history and transformations |
| Warehouse | none | data volume and analyst workflows exceed PostgreSQL/read replicas |
| Native modules | React Native APIs | barcode, NFC, widgets, or background tasks require platform code |

Snowflake, Elasticsearch, Phoenix, Firestore, and independent analytics services
are not part of the MVP architecture.
