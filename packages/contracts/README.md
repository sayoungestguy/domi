# Contracts

`openapi.yaml` is the versioned contract between the Rails API and its clients.
The first contract covers the Phase 0 health slice. API request tests verify the
runtime behavior, while a contract test ensures the checked-in schema remains
present and versioned. Generated client types will be added when the first
business resources are specified in Phase 1.
