# Private local-host operations

## Security boundary

The Domi server is private. By default the API listens only on
`127.0.0.1:3000`; PostgreSQL never publishes a host port. Do not add public DNS,
router port forwarding, UPnP exposure, or a public tunnel.

For a physical phone on the same trusted network, set `DOMI_BIND_ADDRESS` and
`DOMI_APP_HOST` to the machine's exact private LAN address, such as
`192.168.1.20`. Configure the mobile app with
`EXPO_PUBLIC_API_URL=http://192.168.1.20:3000`. Prefer a private/home network,
retain the host firewall, and return to `127.0.0.1` after device acceptance.

Local LAN mode uses explicit HTTP because there is no public ingress or trusted
TLS terminator. This is a conscious private-network exception; do not reuse it
for an internet-facing deployment.

## First start

Requirements are Docker Desktop/Engine with Compose, OpenSSL, curl, and at least
one separate disk or encrypted destination for backup copies.

```bash
bin/local-server init
bin/local-server config
bin/local-server up
bin/local-server status
```

`init` creates `infrastructure/local/.env.local` with mode `0600`, random
database and Rails secrets, and loopback binding. The file is ignored by Git.
Back it up separately from the database; losing `DOMI_SECRET_KEY_BASE` can
invalidate encrypted or signed application data.

Development-style verification and password-reset mail is written inside the
API's private `local_mail` volume. List stored messages with:

```bash
bin/local-server mail
```

## Normal operation

```bash
bin/local-server smoke
bin/local-server logs
bin/local-server backup
bin/local-server down
```

`down` preserves PostgreSQL and mail volumes. Do not use `docker compose down
--volumes` against the local profile.

## Backups

`backup` creates a compressed PostgreSQL custom-format archive, validates its
table of contents, writes a SHA-256 checksum, and restricts both files to mode
`0600`. The primary database is the authoritative backup target; cache, queue,
and cable databases are recreatable runtime stores.

Copy each successful backup and its checksum to an encrypted device that is not
the Domi host. Keeping backups only on the same disk does not protect against
disk failure or theft. Perform a restore drill after schema changes and at least
monthly while the app is in active use.

## Restore

Restore replaces the authoritative primary database. The command validates the
archive, creates an additional safety backup, stops Rails, recreates the target
database, restores with `--exit-on-error`, restarts Rails, and runs a health
check.

```bash
bin/local-server restore backups/local/domi-YYYYMMDDTHHMMSSZ.dump --confirm-restore
```

Only restore archives created by a trusted Domi host. PostgreSQL archives can
contain executable database definitions.

## Upgrade and rollback

Before every upgrade:

1. Confirm CI passed for the target commit.
2. Create and copy a backup off the host.
3. Record the current commit with `git rev-parse HEAD`.
4. Fast-forward to the tested `main` revision.
5. Run `config`, `up`, and `smoke`.

For an application-only rollback, check out the recorded commit and run `up`
again. Do not reverse database migrations automatically. If an incompatible
schema or data change must be reverted, restore the pre-upgrade archive after
reviewing what user changes will be lost.
