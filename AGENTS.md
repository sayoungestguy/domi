# Domi repository instructions

## Tests are required for every code change

- Every implementation, enhancement, bug fix, and behavior-changing refactor
  must include automated tests that prove the intended behavior and protect
  against regression.
- Run every test suite affected by the change. For a vertical slice or a change
  spanning multiple applications, run the relevant API integration tests, the
  complete backend CI suite, and the mobile quality/build gate as applicable.
- Do not treat type checking, linting, or a successful build as a substitute for
  behavior tests when behavior changed.
- If the repository lacks a suitable test harness, add one as part of the
  implementation. If testing cannot be completed because of an external
  blocker, do not commit the implementation; report the blocker and leave the
  work uncommitted.
- Report the exact test commands and results when handing off a change.

## Commits require passing tests

- Commit implementation or enhancement work only after all newly added tests
  and all affected existing test suites pass.
- Never commit with a known test, type, lint, contract, security, or build
  failure relevant to the change.
- Immediately before committing, confirm the working tree contains only the
  intended change and that the latest relevant test run passed against that
  change.
