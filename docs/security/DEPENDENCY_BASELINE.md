# Dependency Advisory Baseline

**Reviewed:** 2026-08-22
**Next review:** On every lockfile change and at least weekly through Dependabot

## Rails API

`bundler-audit` reports no known vulnerabilities for the Phase 0 lockfile.
Brakeman reports no security warnings.

## Expo mobile client

The Phase 2 Expo SDK 57 dependency graph currently produces npm audit findings
in transitive React Native/Metro build tooling: 4 high and 10 moderate findings,
with no critical findings. The actionable leaf packages include:

- `image-size` through Metro. npm's registry reports 2.0.2 as the newest release,
  and the advisory affects versions through 2.0.2, so no fixed release exists.
- `uuid` through Expo's Xcode project tooling. A fixed UUID major exists, but
  forcing that incompatible major beneath `xcode` has not been validated by the
  Expo dependency matrix.

npm proposes downgrading Expo SDK 57/React Native 0.86 to Expo SDK 53/React
Native 0.72. That is not an acceptable remediation because it replaces the
current supported SDK with an older, incompatible stack and does not represent
the generated application's supported dependency graph.

## Temporary decision

- CI fails on critical npm advisories and reports the complete audit output.
- High/moderate findings above are accepted only for the current Expo/Metro
  development toolchain; untrusted image or native-project input must not be processed in
  CI or local automation.
- Do not use `npm audit fix --force` or unvalidated transitive overrides.
- Dependabot and Expo compatibility checks run weekly/on changes.
- Re-evaluate immediately when Expo, Metro, `image-size`, or `xcode` releases a
  compatible fix, or before any workflow processes untrusted build input.

This exception does not apply to future application/runtime dependencies. New
high or critical findings require individual review before merge.

The Phase 2 `@react-native-async-storage/async-storage` runtime dependency does
not introduce a direct advisory. It stores only household-partitioned last-known
inventory reads; authentication credentials remain in SecureStore.
