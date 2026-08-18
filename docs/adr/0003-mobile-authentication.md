# ADR 0003: Use rotating opaque mobile sessions

- **Status:** Accepted for Phase 1 implementation
- **Date:** 2026-08-19

## Context

Domi's first client is a native mobile application. Household information is
private, sessions must be revocable, and permissions can change immediately when
a member is removed. The MVP does not need federated identity or independently
verified JWT claims across multiple services.

## Decision

Email/password authentication will use Rails password hashing and random opaque
session credentials:

- a short-lived bearer access token;
- a longer-lived, single-use rotating refresh token;
- only token digests stored in PostgreSQL;
- refresh-token families revoked on reuse, logout, password change, member risk,
  or account deletion;
- mobile credentials stored in iOS Keychain/Android Keystore through Expo Secure
  Store;
- authorization always evaluates current server-side household membership.

Email verification and password-reset tokens are also random, hashed at rest,
single-purpose, and expiring. Browser session/CSRF design will be decided before
the web client ships.

## Consequences

The API performs a database/cache lookup for authenticated requests, but logout
and membership changes take effect predictably. Domi avoids JWT key rotation,
claim staleness, and premature distributed-auth complexity. Phase 1 must define
token lifetimes, device/session management, brute-force limits, and recovery
flows before implementation is complete.

