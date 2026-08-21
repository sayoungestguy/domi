# Threat model: Phase 1 accounts and households

**Owner:** Domi engineering
**Last reviewed:** 2026-08-20

## Assets and sensitive data

- Password hashes and account email addresses.
- Access, refresh, verification, password-reset, and invitation credentials.
- Household identity, membership, role, and invitation records.
- Device/session metadata such as IP address and user agent.

Passwords and plaintext credentials must never be logged. The database contains
password hashes and one-way credential digests, not recoverable credentials.

## Actors and trust boundaries

- An unauthenticated internet client may register, sign in, verify, reset, and
  present an invitation.
- An authenticated user may belong to multiple households.
- A household member may read household and membership data.
- Only the current household owner may rename the household, issue or revoke an
  invitation, remove a member, or transfer ownership.
- The mobile process is not trusted to enforce authorization. The Rails API and
  PostgreSQL constraints are the enforcement boundary.
- Email and operating-system keychain/keystore providers are external trust
  boundaries.

## Data flows

Credentials enter over HTTPS in production, are filtered from Rails logs, and
are validated by controllers and domain commands. Passwords are hashed by
`bcrypt`. Random opaque credentials are returned to the intended client or sent
by email once; only SHA-256 digests are stored. Authenticated requests resolve a
server-side session, then scope household access through membership. Multi-row
membership and credential transitions run in database transactions.

The mobile app persists only its access and refresh credentials in SecureStore.
It keeps household responses in process memory and clears credentials when
refresh fails or the API rejects the session.

## Threats and controls

| Threat | Impact | Control | Verification |
|---|---|---|---|
| Credential stuffing or endpoint flooding | Account compromise or degraded service | Endpoint rate limits, generic recovery responses, strong password minimum | Request behavior and configuration review |
| Database credential disclosure | Active account or invitation takeover | Store only random-token digests; bounded expiry; revocation and single use | Model/domain tests and schema review |
| Refresh credential replay | Persistent session theft | Rotate on every use; row locking; revoke the entire family when reuse is detected | Rotation/reuse integration test |
| Account enumeration | Privacy disclosure | Verification resend and password-reset request always return an accepted response | Account lifecycle integration test |
| Cross-household identifier substitution | Private data disclosure or mutation | Resolve membership on every household request; do not trust client role state | Cross-household request tests |
| Member privilege escalation | Unauthorized household administration | Owner policy in the API and owner checks in domain commands | Member-denial integration tests |
| Duplicate invitation acceptance | Duplicate membership or inconsistent invitation | Invitation row lock, transaction, unique membership index, single accepted timestamp | Reuse and duplicate membership tests |
| Household without an owner | Orphaned administration | Owner cannot leave/remove self; ownership transfer locks household and memberships; partial unique owner index | Leave/transfer integration tests |
| Email or deep-link interception | Account or invitation takeover | High-entropy, purpose-prefixed, expiring, one-use credentials; HTTPS and platform-associated links required in production | Expiry/single-use tests; deployment checklist |
| Mobile credential extraction | Session takeover | OS SecureStore with this-device-only accessibility; short access lifetime; server revocation | Mobile implementation review |
| Sensitive-data logging | Credential or personal-data leak | Rails parameter filtering; structured errors; no credential logging | Configuration and static review |

## Abuse and recovery

- Authentication and invitation creation/acceptance are throttled at the Rails
  boundary. Production deployment must use a cache shared by all API instances
  so limits cannot be bypassed by changing instances.
- Logout revokes the active refresh family. Password reset revokes every session
  belonging to the account.
- Refresh reuse revokes its credential family and requires the user to sign in
  again.
- Owners may revoke outstanding invitations and remove members. An owner must
  transfer ownership before leaving.
- Security telemetry should use event names and opaque record identifiers only;
  it must exclude raw credentials, passwords, and invitation URLs.

## Residual risks and follow-ups

- Email account compromise can still enable account recovery. Consider MFA or
  passkeys when user risk warrants them.
- Custom-scheme deep links can be claimed by another installed application.
  Production must use platform-associated HTTPS universal/app links before a
  public release.
- SHA-256 is appropriate for high-entropy random credentials, but a database
  disclosure still exposes personal and membership metadata. Encryption,
  retention, and incident response are Phase 6 hardening concerns.
- In-process development rate limiting is not a distributed production control.
  Deployment must select a shared cache or edge limit and test it under load.
- Session metadata retention and user-facing session management need explicit
  privacy and product decisions before beta.
