# Domi Development Phases

**Status:** Accepted delivery plan  
**Date:** 2026-08-19  
**Applies to:** MVP development and post-MVP sequencing

**Progress:** Phases 0–2 complete; Phases 3–4 are implemented with manual acceptance pending.

## 1. Delivery decision

Domi will be developed as a sequence of independently demonstrable vertical
slices. Each phase must end with a working user or operational outcome and pass
its exit criteria before the next phase becomes the primary focus.

Work should proceed through the full implementation path:

```text
Database and constraints
        ↓
Domain command or query
        ↓
Authorization policy
        ↓
API and contract
        ↓
Mobile or web experience
        ↓
Automated tests
        ↓
Telemetry and operational verification
```

This plan deliberately avoids building future services or infrastructure before
the product demonstrates a need for them. The architectural rules in
`TECHNICAL_DESIGN.md` apply to every phase.

## 2. Phase 0 — Engineering foundation

### Outcome

The API and mobile application run locally and can be changed safely through a
repeatable development workflow.

### Scope

- Pin Ruby, Rails, Node, React Native, and PostgreSQL versions.
- Select the package manager and React Native workflow.
- Generate the Rails API in `services/api`.
- Generate the React Native application in `apps/mobile`.
- Configure development and test databases.
- Establish environment configuration and secret-handling conventions.
- Add formatting, linting, type checking, automated tests, and CI.
- Add API and application health checks.
- Establish the OpenAPI contract workflow.
- Add structured logging and error tracking foundations.
- Decide and document the authentication mechanism.
- Add reusable feature, ADR, and threat-model templates.

### Exit criteria

- A clean checkout can install dependencies and start the API and mobile app
  using documented commands.
- The mobile application can call an API health endpoint.
- Database creation, migrations, and test isolation work.
- CI passes formatting, linting, type checks, tests, contract validation, and
  dependency/security checks.
- Runtime and framework choices are recorded in ADRs.

## 3. Phase 1 — Accounts and households

### Outcome

Two people can securely join and manage the same household.

### Scope

- Email registration, verification, login, logout, and password reset.
- Secure mobile credential storage and session renewal/revocation.
- Create, retrieve, and rename a household.
- Owner and member roles.
- Expiring and revocable invitation links or codes.
- Accept invitation and join a household.
- View/remove members, leave a household, and transfer ownership.
- Household-scoped authorization policies and rate limiting.

### Exit criteria

- Two users can create accounts and join the same household.
- Automated tests prove that changing identifiers cannot expose another
  household's data.
- Expired, revoked, and reused invitations behave predictably.
- Duplicate membership is prevented transactionally.
- A household cannot be left without exactly one owner.

## 4. Phase 2 — Inventory vertical slice

### Outcome

Household members can maintain a lightweight, shared view of household supplies.

### Scope

- Categories and inventory items.
- Create, view, edit, archive, restore, and search items.
- `OK`, `LOW`, and `OUT` status transitions.
- Optional quantity, unit, and notes.
- Status filters and duplicate-name warnings.
- Dashboard attention summary.
- Human-readable inventory activity events.
- Loading, empty, error, offline-read, and permission-denied states.

### Exit criteria

- Both members see the same authoritative inventory after synchronizing.
- Each material action is attributed to a member.
- Household authorization, validation, accessibility, and critical flows have
  automated coverage.
- Usability testing confirms that adding or updating a typical item takes only a
  few seconds.

## 5. Phase 3 — Shared shopping list

### Outcome

Household members can build and use one reliable shopping list together.

### Scope

- One active list per household.
- Manual shopping entries with optional quantity and note.
- Link shopping entries to inventory items.
- Prompt to add `OUT` inventory items to shopping.
- Optional household preference for automatic addition.
- Check, uncheck, edit, and remove entries.
- Shopping mode, purchased section, and remaining count.
- Duplicate prevention for linked active entries.

### Exit criteria

- Two members can reliably contribute to the same list.
- Retried requests cannot create duplicate entries.
- Concurrent edits converge predictably after synchronization.
- Shopping mode is usable one-handed, with screen readers and large text.

## 6. Phase 4 — Complete the shopping loop

### Outcome

A household can move from noticing a need through purchasing it and restocking
inventory.

### Scope

- Finish-shopping workflow.
- Shopping-trip and immutable purchased-item history.
- Optional update of linked inventory items to `OK`.
- Preserve unchecked entries on the active list.
- Grouped activity for a completed trip.
- Idempotency keys, database locking, and transactional completion.
- Confirmation, failure recovery, and retry interfaces.

### Exit criteria

- Repeating a completion request cannot create multiple trips.
- Trip creation, list cleanup, activity, and inventory updates commit atomically.
- A failed request leaves all household state consistent.
- The complete product loop works in an end-to-end test and with a real
  household:

```text
Notice → Mark low/out → Add to shopping → Purchase → Finish → Restock
```

Completion of this phase produces the first usable alpha.

## 7. Phase 5 — Realtime and resilience

### Outcome

Connected members see changes promptly, and all clients eventually converge on
authoritative server state after interruptions.

### Scope

- Authorized Rails Action Cable household channel.
- Transactional outbox and background event publishing.
- Resource versions and explicit conflict responses.
- Client cache update/invalidation from realtime messages.
- Refetch on reconnect, foregrounding, and detected gaps.
- Persisted last-known reads with visible stale/offline state.
- Concurrency, disconnection, and reconnection testing.

### Exit criteria

- Connected updates normally propagate within one second.
- Reconnection makes clients converge without losing committed server changes.
- WebSocket failure never affects the durability of the underlying operation.
- Concurrent-device and outbox-retry scenarios pass automated tests.

Phoenix will not be introduced in this phase unless measured concurrency,
scaling, or ownership requirements justify a separate service through an ADR.

## 8. Phase 6 — Notifications and MVP hardening

### Outcome

Domi is ready for sustained beta use by real households.

### Scope

- Mobile device registration and notification provider integration.
- Invitation, shopping-entry, and completed-trip notifications.
- Per-category notification preferences.
- Account and household deletion workflows.
- Data-export groundwork.
- Accessibility and security audits.
- Performance profiling and optimization.
- Backup, restoration, deployment, and rollback verification.
- Privacy documentation and operational runbooks.
- Controlled product analytics and success-measure dashboards.

### Exit criteria

- All MVP definition-of-done requirements in `PRD.md` pass.
- Crash and error monitoring are active in production-like environments.
- A backup has been restored successfully in a test environment.
- No unresolved high-severity security or accessibility issues remain.
- Invited households can use the product for several weeks with an acceptable
  failed-sync and crash-free-session rate.

Completion of this phase and resolution of beta findings produces the mobile
MVP.

## 9. Phase 7 — Web management

### Outcome

Existing users can perform administration and detailed management on a larger
screen.

### Scope

- Vue management application in `apps/web`.
- Household settings, invitations, and membership management.
- Inventory management and activity history.
- Account, privacy, export, and deletion controls.
- Reuse of existing API contracts and authorization rules.

### Exit criteria

- Web and mobile clients produce consistent household state.
- No business rule is duplicated exclusively in the web client.
- Critical administrative flows pass accessibility and end-to-end tests.

## 10. Phase 8 — Offline writes

### Outcome

Shopping remains reliable in stores with intermittent or unavailable
connectivity.

### Entry condition

Research or beta evidence demonstrates that cached read-only access is
insufficient. This phase must not begin solely because offline support is
technically interesting.

### Scope

- Durable local mutation queue.
- Idempotent synchronization protocol.
- Domain-specific conflict-resolution rules.
- Pending, failed, retrying, and resolved user interfaces.
- Device, restart, clock-skew, and network-condition test matrix.

### Exit criteria

- Queued operations survive application and device restarts.
- Retrying cannot duplicate purchases or entries.
- Conflicts are visible and recoverable rather than silently discarded.
- Clients converge after extended disconnection.

## 11. Phase 9 — Additional household domains

New domains are introduced individually and validated before the next one is
started. The proposed order is:

1. Chores.
2. Bills and expenses.
3. Appliances and maintenance.
4. Receipts and warranties.
5. Global household search.
6. Consumption analytics and useful suggestions.

Each domain receives its own product discovery, milestone scope, data model,
privacy assessment, technical design, success measure, and go/no-go decision.
Snowflake, Elasticsearch, Python models, or separate services are added only
when the chosen domain and measured workload justify them.

## 12. Release milestones

| Release | Required phases | Intended audience |
|---|---|---|
| Developer preview | Phase 0–1 | Development team |
| Internal prototype | Phase 0–2 | Team and close collaborators |
| Alpha | Phase 0–4 | One or two real households |
| Beta | Phase 0–6 | Invited households |
| Mobile MVP | Phase 0–6 plus beta fixes | Initial public users |
| Web release | Phase 7 | Existing users |
| Offline release | Phase 8 | Users with demonstrated need |

## 13. Phase operating rules

Before work begins, each phase must have:

- a named owner;
- user outcome and measurable success condition;
- included and explicitly excluded functionality;
- user stories and acceptance criteria;
- data-model and API changes;
- design states and accessibility requirements;
- security and privacy assessment;
- test and observability plan;
- demo scenario and exit checklist.

During implementation:

- Finish the smallest end-to-end slice before expanding horizontally.
- Keep incomplete user-facing work behind short-lived feature flags.
- Update contracts, documentation, tests, telemetry, and rollback plans with the
  code that changes them.
- Record architecture-significant deviations as ADRs.
- Do not activate reserved services without an accepted ADR and operational
  ownership.

At the phase boundary, review evidence against exit criteria. Unfinished exit
criteria are carried as explicit blockers or consciously re-scoped decisions;
they are not silently deferred.

## 14. Immediate next step

Complete the Phase 3 and Phase 4 physical-device acceptance walkthroughs with
two household members. Record any findings before beginning Phase 5 realtime
and resilience work; unresolved acceptance failures remain explicit blockers.
