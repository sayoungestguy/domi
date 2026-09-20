# Privacy lifecycle operations

## User controls

- Account export is available to every signed-in user.
- Full household export and deletion are owner-only.
- Household deletion requires the exact household name.
- Account deletion requires the current password and `DELETE MY ACCOUNT`.
- An account that owns a household must transfer ownership or delete that
  household first.

Exports are JSON and intentionally exclude password hashes, session/token
digests, invitation secrets, and Rails configuration secrets.

## Retention

Production Solid Queue runs `Privacy::EnforceRetentionJob` daily. It removes:

- activity and in-app notifications older than 90 days; and
- expired/revoked sessions and expired/accepted/revoked invitations after 30 days.

Every run creates a privacy audit containing aggregate deletion counts.

## Backup limitation

Application deletion does not rewrite existing PostgreSQL backup archives.
Backups must be encrypted, access-controlled, and expired according to the
operator's rotation. After restoring an older archive, run the retention job and
review deletion audit records before returning the service to users.
