# Phase 0 — Engineering foundation

**Status:** Complete  
**Started:** 2026-08-19
**Completed:** 2026-08-19

## Implemented foundation

- Pinned Ruby, Rails, PostgreSQL, Node, npm, Expo, React Native, and TypeScript.
- Docker-based Rails development environment and local PostgreSQL.
- Rails API and Expo TypeScript applications generated in their documented
  repository boundaries.
- Versioned JSON health endpoint and typed mobile connectivity screen.
- Initial OpenAPI contract and contract test.
- Rails lint, security, and test tooling from the Rails generator.
- Mobile TypeScript and ESLint checks.
- Root CI, dependency updates, and reusable phase/feature/ADR/threat templates.
- Authentication mechanism selected for Phase 1 in ADR 0003.

## Verification checklist

- [x] Clean container build
- [x] PostgreSQL health check and database preparation
- [x] Rails tests
- [x] Rails lint and security checks
- [x] API health response over HTTP
- [x] Mobile TypeScript check
- [x] Mobile lint
- [x] Mobile iOS production bundle
- [x] Expo dependency compatibility check
- [x] npm critical-advisory gate

The npm audit baseline contains transitive high/moderate findings in the current
official Expo/Metro toolchain but no critical findings. The reviewed temporary
exception and remediation triggers are recorded in
`../security/DEPENDENCY_BASELINE.md`.
