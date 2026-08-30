# Phase 6 — Notifications and MVP hardening

**Status:** In progress — local-host operations slice implemented
**Started:** 2026-08-30
**Owner:** Repository owner

## Outcome

Domi can sustain private beta use from an owner-operated local machine, with
recoverable data and explicit operational limits. Later Phase 6 slices add
optional notifications, privacy workflows, and final audits without making the
API internet-accessible.

## Hosting decision

- No Oracle Cloud or other public host.
- No public API, DNS, router port forwarding, or automatic deployment.
- Loopback-only default; exact private LAN binding is opt-in for device testing.
- PostgreSQL remains container-network-only.
- GitHub Actions validates builds but holds no deployment/package-write access.

## Slice 6A — Private local-host hardening

Included:

- production Rails/PostgreSQL Compose profile with health-gated startup;
- generated local secrets and explicit configuration validation;
- operator commands for startup, status, logs, health, stored mail, and shutdown;
- validated custom-format database backups, checksums, confirmation-gated
  restore with a safety backup, and application rollback guidance;
- local-host ADR, runbook, threat assessment, and automated configuration tests.

Acceptance criteria:

- [x] PostgreSQL has no published host port.
- [x] API binding defaults to loopback and LAN use requires an explicit address.
- [x] Missing database/Rails secrets make Compose configuration fail closed.
- [x] API startup waits for a healthy database and both services have health checks.
- [x] Backups are non-empty, inspectable custom archives with checksums.
- [x] Restore requires explicit confirmation and first makes a safety backup.
- [x] Complete an isolated full backup/restore drill and record the evidence.
- [ ] Complete two-device Phase 2–5 acceptance against the local host.

Verification evidence on 2026-08-30:

- an isolated production-mode stack became healthy on a non-default loopback port;
- registration queued and delivered verification mail into the protected local volume;
- a custom archive captured a database probe, the live value was changed, and
  restore recovered the original `before-backup` value;
- restore created a separate safety archive, restarted Rails, and passed the API
  health check; and
- all disposable containers, networks, and volumes were removed after the drill.

## Remaining Phase 6 slices

### 6B — Optional notifications

Decide whether any third-party push provider is acceptable. If accepted, add
device registration, invitation/shopping/trip notifications, category
preferences, token revocation, redacted payloads, and delivery observability.
If outbound third-party delivery is rejected, document notifications as an MVP
scope change and retain in-app realtime updates only.

### 6C — Privacy lifecycle

Implement account deletion, owner-controlled household deletion, data export,
retention rules, and auditable asynchronous cleanup.

### 6D — Beta readiness

Complete accessibility and security audits, performance profiling, error/crash
monitoring suitable for local hosting, success-measure reporting, backup/restore
evidence, and physical-device acceptance.

## Excluded

- Internet deployment and remote access.
- High-availability or multi-host database operation.
- Public service availability targets.
- Native store release/signing until a distribution policy is chosen.
