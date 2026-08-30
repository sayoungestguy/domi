# Domi Product Requirements

**Product:** Domi  
**Tagline:** Your home, organised.  
**Version:** 1.1  
**Status:** Private self-hosted MVP specification
**Platforms:** iOS and Android; web administration follows the MVP

## 1. Product summary

Domi is the shared source of truth for running a home. The first release solves
one frequent problem exceptionally well: household members forget what needs
to be bought. It combines a lightweight household inventory with a shared
shopping list, so a person can record a need in seconds and every member sees
the same current state.

The long-term vision is a household operating system spanning chores, bills,
expenses, appliances, maintenance, receipts, search, and useful predictions.
Those capabilities must build on—not distract from—the core shared-list loop.

## 2. Problem and opportunity

Household state is fragmented across chat messages, notes, spreadsheets,
calendars, receipts, and memory. Messages get buried, purchases are duplicated,
and useful history is lost. Existing inventory tools often demand exact counts
and excessive data entry, making them unsuitable for everyday use.

Domi answers a single recurring question:

> What does our home need?

## 3. Product principles

1. **Extremely low friction.** A useful item can be added with a name and one
   status; richer data is optional.
2. **Household first.** Shared state, attribution, and coordination are the
   default—not an individual list with sharing bolted on.
3. **Useful before intelligent.** The product works without AI, predictions, or
   third-party data.
4. **Progressive complexity.** A household can use Domi as only a shopping list.
5. **Calm and trustworthy.** State changes are clear, reversible where possible,
   and never hidden behind surprising automation.
6. **Privacy by design.** Household data is not sold or used for advertising.

## 4. Users and jobs

### Household coordinator

Frequently plans purchases and keeps the home running. They need to see what
requires attention, invite others, avoid duplicate purchases, and trust that
the list is current.

### Household member

Contributes occasionally. Their common flow is: notice something, open Domi,
change or add one item, and leave. Their experience must require almost no
training.

### Future: helper or restricted member

May manage lists and chores without access to sensitive financial or household
administration data. Fine-grained roles are explicitly outside the MVP.

## 5. MVP scope

### 5.1 Accounts

Users can register with email, verify ownership of the address, sign in, sign
out, request a password reset, update name/avatar, and delete their account.
Social login and passkeys are deferred.

### 5.2 Households and membership

- A user creates a named household and becomes its owner.
- An owner creates a revocable, expiring invitation link or code.
- A signed-in user can accept an invitation and join once.
- MVP roles are `owner` and `member`.
- Owners can view members, remove a member, transfer ownership, and revoke an
  invitation.
- A household must always have exactly one owner. The owner must transfer
  ownership or delete the household before leaving.

### 5.3 Dashboard

The home screen answers “what needs attention?” and shows:

- count of active shopping items;
- inventory items marked low or out;
- recent household activity;
- a prominent quick-add action;
- sync/offline state when relevant.

### 5.4 Inventory

An inventory item has a name, category, status (`ok`, `low`, or `out`), optional
quantity, optional unit, optional note, creator/updater, and timestamps.

Users can create, view, edit, archive, search, and restore items. Names are
trimmed and compared case-insensitively within a household to warn about likely
duplicates. A duplicate warning does not block creation because similarly named
items may be legitimate.

Changing an item to `out` prompts the user to add it to the active shopping
list. A household preference can do this automatically. Automation must not
create a second active shopping entry for the same inventory item.

### 5.5 Shopping list and shopping mode

Each household has one active list in the MVP. Members can add, edit, remove,
check, and uncheck entries; add an optional quantity and note; and see who made
the latest change.

Shopping mode keeps unpurchased entries first, displays the remaining count,
uses large tap targets, and allows rapid toggling. Completing a trip:

1. records a purchase containing the checked entries;
2. optionally moves linked inventory items to `ok`;
3. removes completed entries from the active list;
4. leaves unchecked entries on the list; and
5. records one human-readable activity summary.

The completion operation is atomic and safe to retry.

### 5.6 Activity

Members see a household-scoped chronological feed for material events such as
item creation, status changes, shopping additions, completed trips, and member
joins. Routine toggles may be grouped to prevent noise. MVP history is retained
for at least 90 days.

### 5.7 Synchronisation and notifications

Clients receive household changes without manual refresh while connected.
Temporary reconnects trigger a refetch so the visible list converges on server
state. Initial push notifications are invitations, a new shopping entry, and a
completed shopping trip. Users can disable each notification category.

### 5.8 Search

MVP search covers active and archived inventory names and active shopping entry
names within the current household. It is case-insensitive and returns useful
results in under one second at expected household scale.

## 6. Key flows and acceptance criteria

### Activation flow

1. A new user creates an account and a household.
2. They add at least five items.
3. They invite another person.
4. The second person joins and sees the same items.
5. Either person completes at least one shopping entry.

An activated household has completed all five steps.

### Inventory-to-shopping flow

Given a member changes Milk from `ok` to `out`, when auto-add is disabled, Domi
offers to add Milk to shopping. Accepting creates one linked entry. Repeating
the status change cannot create a duplicate active entry.

### Concurrent shopping flow

Given two members have the same list open, when one checks an entry, the other
sees the change within one second under normal connectivity. If both edit the
same entry, the server accepts valid operations in arrival order and both
clients converge after receiving/refetching the authoritative version.

### Access-control flow

Every household resource request verifies active membership. Knowing another
household's identifier must never reveal whether its resources exist.

## 7. Non-functional requirements

| Area | MVP requirement |
|---|---|
| Accessibility | WCAG 2.2 AA for applicable mobile/web surfaces; screen-reader labels; 44×44 pt minimum touch targets |
| API latency | p95 under 500 ms for normal operations at launch scale |
| Realtime | connected change propagation under 1 second p95 |
| Startup | last-known home screen usable within 3 seconds on a typical supported device |
| Reliability | transactional completion; idempotent retry for mutation commands |
| Security | TLS, secure password hashing, rate limiting, scoped authorization, no secrets in clients/logs |
| Privacy | account/household deletion, data export planned before public launch, no advertising use |
| Compatibility | current and previous major iOS/Android releases at launch, subject to framework support |

## 8. Success measures

The primary metric is **weekly active households**: households with at least one
meaningful inventory, shopping, purchase, or membership action that week.

Supporting measures:

- activation rate and time to activation;
- percentage of households with two or more active members;
- week 1, 4, and 8 household retention;
- shopping entries added and completed;
- shopping trips completed;
- inventory status updates;
- crash-free sessions and failed-sync rate.

Initial product hypotheses to validate (not launch promises): at least 40% of
new households activate within seven days, and at least 25% of activated
households remain active in week four.

## 9. MVP non-goals

Chores, bills, expense management, bank integrations, appliances, maintenance,
receipt OCR, exact stock accounting, barcode/NFC, global search, meal planning,
AI, prediction, analytics warehousing, and smart-home integrations are out of
scope.

## 10. Delivery stages

1. **Foundation:** accounts, households, membership, deployment, telemetry.
2. **Usable vertical slice:** inventory, active shopping list, permissions.
3. **MVP completion:** shopping mode, trip completion, activity, realtime,
   notifications, accessibility and reliability hardening.
4. **Post-MVP:** basic web management, richer household roles, offline mutation
   queue, then new household domains based on evidence.

The MVP API and database run on the product owner's local machine. They are not
published through public DNS or router port forwarding. Supported clients use
loopback during host-only use or an explicitly selected private LAN address.
Public SaaS hosting is outside the current product plan.

## 11. Definition of done

The MVP is done when two real people on supported mobile platforms can create
accounts, join one household, share inventory and shopping state, observe each
other's changes, finish a shopping trip, update linked inventory, and see a
clear activity record—with household isolation, accessibility checks, error
monitoring, backups, and recovery procedures verified in a production-like
environment.

## 12. Open product decisions

- Whether one account may belong to multiple households at first release.
- Invitation expiry duration and whether owners may limit uses.
- Whether push notifications ship at beta or public launch.
- Required retention period for activity and soft-deleted data.
- Launch regions, supported languages, and the corresponding privacy terms.
