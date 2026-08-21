# Domi API

Rails 8.1 API and source of truth for Domi. It uses PostgreSQL for application
data and the Rails Solid adapters, keeping Redis out of the foundation until a
measured requirement justifies it.

From the repository root:

```sh
bin/setup
bin/dev
```

The versioned API includes account authentication, profile, household,
membership, and invitation resources. Its executable contract is
`../../packages/contracts/openapi.yaml`; the connectivity endpoint is:

```text
GET http://localhost:3000/api/v1/health
```

Run the API checks through the pinned container toolchain:

```sh
docker compose run --rm -e RAILS_ENV=test api bin/ci
```

Development authentication emails are delivered as files under `tmp/mail`, so
their `domi://` verification and reset links can be opened without an external
email service. Production must configure a delivery provider and associated
HTTPS app links before release.

Architecture and implementation rules live in `../../docs/ARCHITECTURE.md` and
`../../docs/TECHNICAL_DESIGN.md`.
