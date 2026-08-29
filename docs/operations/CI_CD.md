# Continuous integration and delivery

Domi uses GitHub Actions for pull-request validation and continuous delivery.
The pipeline intentionally stops at publishing a deployable API image; deploying
that image to UAT will be added after the Oracle Cloud host, domain, TLS, and
secrets are configured.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request, every push to `main`, and
manual dispatch. Its required gates are:

| Check | Coverage |
| --- | --- |
| Workflow configuration | Parses the workflow YAML and protects required gates and delivery conditions. |
| Backend | Rails tests, seeds, RuboCop, Bundler Audit, Brakeman, and Zeitwerk against PostgreSQL. |
| Mobile | Jest coverage, TypeScript, Expo compatibility, ESLint, production-dependency audit, and iOS JavaScript export. |
| Production API image | Builds the production Dockerfile using Buildx. |
| Playwright E2E | Runs the Chromium scenarios against real Rails, PostgreSQL, Expo web, and Action Cable services. |
| Required CI result | Fails unless every preceding gate succeeds and gives branch protection one stable check name. |

The Actions run summary shows every gate. Downloadable artifacts are retained
for 14 days and include:

- backend CI logs, RuboCop JSON, and Brakeman JSON;
- Jest logs and HTML/LCOV coverage, ESLint JSON, TypeScript logs, and npm audit JSON;
- the built iOS JavaScript bundle for seven days; and
- the Playwright HTML report, traces, screenshots, and retained failure videos.

## Continuous delivery

`.github/workflows/publish-api.yml` runs only after a successful `CI` workflow
caused by a push to `main`. It checks out the exact tested commit, rebuilds the
production API image with provenance and an SBOM, and publishes these tags:

```text
ghcr.io/<repository-owner>/domi-api:latest
ghcr.io/<repository-owner>/domi-api:sha-<full-commit-sha>
```

It uses the repository-provided `GITHUB_TOKEN`; no registry password is needed.
The repository or organization must allow GitHub Actions to create packages.
Treat the immutable `sha-*` tag as the deployment input and reserve `latest` for
human convenience.

Native App Store or Play Store delivery is not configured because it requires
Apple/Google signing credentials and a chosen Expo EAS release policy.

## Repository settings

After merging the workflow, configure the `main` branch ruleset to require
`CI / Required CI result` before merging. Also require pull requests and prevent
force pushes. Do not select the individual jobs as additional required checks
unless separate visibility is desired; the aggregate result already enforces all
of them.

## Local equivalents

Run the same core gates before pushing:

```bash
bin/validate-ci
bin/check
npm run e2e
docker build --file services/api/Dockerfile --tag domi-api:local services/api
```

GitHub-hosted runners and artifact storage are free within the allowance for the
repository account. Keep the current retention windows short to control storage.
