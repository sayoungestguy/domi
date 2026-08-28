# Contracts

`openapi.yaml` is the versioned contract between the Rails API and its clients.
Version 1.4.0 covers the system, authentication, household, inventory, shopping,
and completed-trip APIs through Phase 4. API integration tests verify runtime
behavior, while the contract test checks versioning, local references, and the
complete path inventory. Generated client types remain a future improvement;
the mobile types are maintained alongside the checked-in contract today.
