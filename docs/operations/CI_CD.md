# Continuous integration and local delivery

Domi uses GitHub Actions for validation. It does not deploy the API to an
internet host or publish a runtime image to a public registry.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request, every push to `main`, and
manual dispatch. Its required gates are:

| Check | Coverage |
| --- | --- |
| Workflow configuration | Parses CI YAML and validates the private local-host profile. |
| Backend | Rails tests, seeds, RuboCop, Bundler Audit, Brakeman, and Zeitwerk against PostgreSQL. |
| Mobile | Jest coverage, TypeScript, Expo compatibility, ESLint, production-dependency audit, and iOS JavaScript export. |
| Production API image | Builds the same production Dockerfile used by the local host. |
| Playwright E2E | Runs Chromium scenarios against real Rails, PostgreSQL, Expo web, and Action Cable services. |
| Required CI result | Fails unless every preceding gate succeeds. |

Downloadable reports are retained for 14 days: backend CI/RuboCop/Brakeman,
mobile Jest coverage/ESLint/TypeScript/npm audit, and Playwright HTML traces and
failure evidence. The iOS JavaScript bundle is retained for seven days.

## Local delivery

After a tested change is merged, the operator updates the checkout on the local
server and runs:

```bash
bin/local-server backup
git pull --ff-only origin main
bin/local-server config
bin/local-server up
bin/local-server smoke
```

`up` builds the production image locally and waits for PostgreSQL and Rails
health checks. Roll back application code by checking out the previous tested
commit and running `up` again. Restore data only through the confirmation-gated
restore command in the local-host runbook.

No GitHub workflow has package-write or deployment credentials. Native store
delivery is also not configured.

## Repository settings

Require `CI / Required CI result` on `main`, require pull requests, and prevent
force pushes. The aggregate result already enforces all component jobs.

## Local equivalents

```bash
bin/validate-ci
bin/validate-local-host
bin/check
npm run e2e
docker build --file services/api/Dockerfile --tag domi-api:local services/api
```
