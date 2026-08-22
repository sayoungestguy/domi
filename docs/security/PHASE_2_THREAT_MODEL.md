# Threat model: Phase 2 inventory

**Owner:** Domi engineering
**Last reviewed:** 2026-08-22

## Assets and sensitive data

- Household inventory names, quantities, units, categories, and private notes.
- Membership identity and actor attribution.
- Activity history and timestamps.
- Last-known inventory cached on a mobile device.

## Actors and trust boundaries

- Authenticated household members may read and mutate their household inventory.
- Non-members and members of a different household must learn nothing from
  substituted household, item, or category identifiers.
- The mobile client is untrusted for household identity, item version, status,
  category ownership, and validation.
- PostgreSQL and the Rails API remain authoritative. AsyncStorage is only a
  last-known read cache and is not a secret store or mutation queue.

## Data flows

The API authenticates an opaque access credential, resolves the household
through current membership, then resolves every inventory resource through that
household. Commands lock the item, validate its expected version, validate
category ownership and values, commit the item and controlled activity metadata
in one transaction, and return a stable serializer. The mobile app partitions
cached responses by household ID and replaces them only after successful reads.

## Threats and controls

| Threat | Impact | Control | Verification |
|---|---|---|---|
| Cross-household identifier substitution | Inventory disclosure or mutation | Membership-scoped household and nested resource queries | Request denial tests |
| Category from another household | Boundary bypass or misleading grouping | Same-household validation and scoped category lookup | Model and request tests |
| Lost concurrent update | One member silently overwrites another | Row lock, public version, required `If-Match`, `409` conflict | Stale-write integration test |
| Invalid status or negative quantity | Corrupt attention state | Model validation plus database check constraints | Model/database tests |
| Search wildcard or oversized input abuse | Expensive queries or degraded service | Escape SQL wildcards, bind parameters, 120-character limit, household indexes | Query tests and code review |
| Notes exposed in logs/activity | Private household text disclosure | Filter `notes`; activity allowlists controlled name/status metadata only | Configuration and serializer review |
| Misleading offline state | User acts on stale information | Visible stale banner, saved timestamp, read-only semantics; no queued-write claim | Mobile state review |
| Device storage disclosure | Local inventory privacy loss | OS application sandbox; credentials remain in SecureStore; cache contains no auth token | Storage implementation review |
| Activity tampering | Loss of accountability | Activity created in the same transaction as commands and not exposed to update endpoints | Integration tests and route review |
| Archive used as destructive deletion | Accidental data loss | Soft archive, explicit confirmation, restore endpoint | Request and mobile-flow tests |

## Abuse and recovery

- Inventory validation failures and conflicts use stable machine codes without
  exposing another household's existence.
- Clients refetch after conflicts and show the authoritative version rather than
  automatically replaying a stale mutation.
- Archived records can be restored. Legal deletion remains a separate Phase 6
  workflow.
- If a device is lost, account-session revocation removes API access; locally
  cached non-secret inventory remains subject to the device's application and
  lock-screen protections.

## Residual risks and follow-ups

- AsyncStorage is not encrypted. Evaluate an encrypted general-data store if
  beta users classify inventory as requiring stronger at-rest protection.
- Search uses indexed household/name columns but substring matching may require
  trigram indexes after representative-data query-plan measurement.
- Activity history is not yet paginated because the dashboard returns only ten
  recent records. A growing history endpoint must use cursor pagination.
- Realtime convergence, outbox delivery, and robust reconnect behavior remain
  Phase 5 work; durable offline mutation recovery remains conditional Phase 8
  work.
