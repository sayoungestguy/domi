# Phase 1 — Accounts and households

**Status:** Complete
**Started:** 2026-08-20
**Completed:** 2026-08-20

## Outcome

Two verified Domi users can authenticate, share a household through a secure
invitation, and manage that household without crossing another household's
authorization boundary.

## Included

- Email registration, verification, sign-in, sign-out, and password reset.
- Opaque access and refresh credentials stored as SHA-256 digests by the API.
- Fifteen-minute access credentials, 30-day rotating refresh credentials, and
  refresh-family revocation when a used credential is presented again.
- Secure credential storage in the mobile operating system keychain/keystore.
- Automatic single-retry session renewal in the mobile API client.
- Household creation, listing, retrieval, and renaming.
- Exactly one owner role per household and zero or more member roles.
- Seven-day, single-use, revocable invitation links.
- Invitation acceptance, member listing/removal, leaving, and ownership
  transfer.
- Household-scoped policies, opaque not-found responses, database constraints,
  transactional role transitions, and throttling on abuse-prone endpoints.
- A versioned OpenAPI 3.1 contract and consistent camel-case JSON envelopes.
- Deep-link handling for verification, password reset, and invitations.

## Excluded

- Social login, passkeys, multi-factor authentication, and enterprise identity.
- Production email-provider selection and mobile universal/app-link hosting.
- Account deletion and household deletion; these remain Phase 6 work.
- Inventory, shopping, realtime synchronization, and push notifications.
- A web administration client.

## Data and API decisions

- PostgreSQL UUID primary keys make public identifiers non-sequential.
- `citext` and a unique index make email identity case-insensitive.
- A unique `(household_id, user_id)` index prevents duplicate memberships.
- A partial unique index allows at most one `owner` membership per household.
- Domain commands own multi-record operations. Controllers perform transport,
  authentication, parameter handling, policy checks, and serialization only.
- Invitation and authentication credentials are returned once and never stored
  in plaintext. Verification and reset credentials are likewise stored only as
  digests.
- The API remains the source of truth; mobile state is a view of server state.
- Local authentication mail is written to `services/api/tmp/mail`. Production
  must configure an email provider and public deep-link routing before release.

The API additions are documented in `../../packages/contracts/openapi.yaml`.
Security analysis is in `../security/PHASE_1_THREAT_MODEL.md`.

## Acceptance and exit criteria

- [x] Two accounts can be verified and can join the same household.
- [x] A user cannot read or mutate a household by changing an identifier.
- [x] Expired, revoked, reused, and unknown invitations share a predictable
  failure path.
- [x] Duplicate membership is prevented transactionally and by the database.
- [x] Ownership transfer is atomic and an owner cannot leave before transfer.
- [x] Refresh credentials rotate and detected reuse revokes the credential
  family.
- [x] Authentication and household request flows have automated coverage.
- [x] The mobile client passes TypeScript, lint, dependency compatibility, and
  production-bundle checks.
- [x] Rails tests, contract checks, lint, eager loading, dependency audit, and
  static security analysis pass.

## User experience states

- Authentication supports sign-in, registration, verification, password-reset
  request, and password-reset completion states.
- Household management supports empty, loading, validation/error, owner-only,
  and member views.
- Controls use the Phase 0 design tokens, 48-point minimum touch targets,
  accessible labels, live status messages, and readable error text.
- Offline writes are deliberately excluded. A failed network request remains
  visible and safe to retry; durable offline behavior begins only if Phase 8's
  entry condition is met.

## Verification evidence

- Rails: account lifecycle, token rotation/reuse, household isolation,
  invitation lifecycle, duplicate membership, removal, leaving, and ownership
  transfer integration tests.
- Contract: OpenAPI version and all Phase 1 paths checked in CI.
- Mobile: strict TypeScript, ESLint, Expo dependency validation, and production
  bundle generation.
- Security: Brakeman, `bundler-audit`, npm critical-advisory gate, and the Phase
  1 threat-model review.

## Demo

1. Register and verify two users through their Domi deep links.
2. Sign in as the first user and create a household.
3. Create and share an invitation; accept it as the second user.
4. Confirm that both users can see the household and its members.
5. Confirm a member cannot rename the household or remove the owner.
6. Transfer ownership, remove or leave as allowed, and sign out.

## Follow-ups

- Phase 2 builds inventory as the next vertical slice using these household
  authorization and domain-command templates.
- Configure production SMTP/API delivery, verified sender identity, and public
  deep-link association files during deployment hardening.
- Add production telemetry for sign-in failures, rate-limit responses, refresh
  reuse, invitation acceptance, and authorization denial without recording
  credentials or password fields.
- Revisit stronger authentication only when product risk or user demand
  justifies it.
