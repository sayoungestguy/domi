# Infrastructure

Infrastructure is local-first. `local/compose.yaml` runs the production Rails
image and PostgreSQL on the owner's machine with no published database port and
a loopback-only API default.

Use `bin/local-server init`, review `local/.env.local`, then use
`bin/local-server up`. Binding to a private LAN address is an explicit operator
choice for physical-device testing. Never configure router port forwarding.
Operations, backup, restore, and rollback steps are documented in
`../docs/operations/LOCAL_HOSTING.md`.
