# ADR 0001: Start with a Rails modular monolith

- **Status:** Accepted
- **Date:** 2026-08-19

## Context

The source product plan proposed Rails, Phoenix, TypeScript, Python, Redis,
Elasticsearch, Firestore, and Snowflake across staged capabilities. The MVP
requires accounts, household authorization, inventory, shopping, activity, and
near-real-time updates. A small product has not yet demonstrated independent
scaling or release needs for those capabilities.

## Decision

Implement the MVP as a Rails modular monolith backed by PostgreSQL, with a React
Native client. Use Rails realtime capabilities and a transactional outbox. Add
Redis when jobs/caching require it. Keep domain boundaries explicit in code and
version the external API contract.

## Consequences

The team operates fewer deployables and can keep business transactions local.
Domain discipline is required to avoid a tangled monolith. Future extraction
may require event replay or data migration, so integration boundaries and event
contracts must remain explicit. Any extraction requires a new ADR supported by
measured constraints.

