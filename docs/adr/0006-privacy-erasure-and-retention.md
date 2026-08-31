# ADR 0006 — Privacy erasure, exports, and retention

**Status:** Accepted

## Context

Domi must let a person retrieve their data and leave the service without
breaking shared household history. It must also let an owner permanently remove
a household. Local database backups cannot be selectively rewritten safely.

## Decision

- Account export contains the account's profile, memberships, authored
  activity, received notifications, and preferences. It excludes credentials,
  session tokens, password hashes, and invitation secrets.
- Full household export is owner-only and excludes invitation token digests.
- Account deletion requires the current password and exact confirmation phrase.
  Owned households must first be transferred or deleted. Credentials, sessions,
  memberships, received notifications, preferences, email, and display name are
  erased; a neutral tombstone preserves foreign-key integrity in shared history.
- Household deletion requires owner authorization and the exact household name,
  then physically removes all household-scoped data transactionally.
- Activity and in-app notifications are retained for 90 days. Expired sessions
  and terminal invitations are removed after 30 days by a scheduled job.
- Privacy audits contain IDs, action names, request IDs, and aggregate counts,
  never exported content, credentials, or free-form household data.

## Consequences

Encrypted backups may retain pre-deletion data until their normal backup
rotation expires. Restoring an older backup can reintroduce deleted data, so the
operator must rerun retention and honor deletion records after a restore.
