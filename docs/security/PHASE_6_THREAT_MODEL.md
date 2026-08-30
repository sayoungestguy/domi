# Phase 6 local-host threat model

## Assets and boundary

Protected assets are credentials, household data, notification content and
preferences, database backups, Rails secrets, and stored authentication mail. The trust boundary is the local host,
its Docker network, and—only when explicitly enabled—the trusted private LAN.

## Principal threats and controls

| Threat | Control |
| --- | --- |
| Accidental internet exposure | Loopback default, exact-address LAN opt-in, no router forwarding/public tunnel, documented firewall requirement. |
| Direct database access | PostgreSQL has no host port; only Compose services share its network. |
| Secrets committed to Git | Generated `.env.local` is ignored, mode `0600`, and required interpolation fails closed. |
| Host/disk loss | Validated PostgreSQL archives, SHA-256 checksums, encrypted off-host copies, recurring restore drills. |
| Destructive or wrong restore | Trusted archive requirement, explicit confirmation flag, archive inspection, automatic safety backup, API stopped during replacement. |
| Malicious backup | Restore only owner-generated archives; PostgreSQL archives may contain executable definitions. |
| Untrusted LAN traffic | LAN binding is temporary/explicit; use trusted private networks and host firewall; public use requires TLS and a new threat review. |
| Mail/token disclosure | Stored mail remains in a private Docker volume and is accessed only through the operator command. |
| Notification disclosure | Inbox queries are membership- and recipient-scoped; no device token or payload is sent to a third party. |
| Vulnerable/stale host | Operator owns OS/Docker patching, dependency CI reports, and controlled image rebuilds. |

## Residual risk

The service depends on one host, one local network, and operator discipline.
Private LAN HTTP does not protect against a compromised LAN. Backups on the same
physical device do not protect against device loss. These are accepted only for
the private MVP and must be revisited before any public or remote-access design.
