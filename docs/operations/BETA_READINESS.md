# Local beta readiness

## Operator evidence

Run the aggregate readiness report while the private local stack is healthy:

```bash
bin/local-server report
```

The report contains counts and rates only. It intentionally excludes user IDs,
emails, display names, household names, inventory and shopping names, notes,
tokens, and invitation material. Store dated report output with private release
records if trend evidence is needed; do not publish it as a public dashboard.

Review these signals weekly during beta:

- weekly active households and seven-day activation rate;
- households with multiple members;
- shopping-entry, completed-trip, and inventory-status activity;
- pending/retried outbox events and oldest pending-event age;
- unexpected `application.error` entries from `bin/local-server logs`.

An unexpected exception log contains only its class, request ID, release,
environment, route metadata, and HTTP status. It never includes exception
messages, request parameters, household content, notes, or tokens.

## Automated release gates

Before a beta build:

1. Run `bin/check`.
2. Run `npm run e2e` and retain its HTML report on failure.
3. Confirm the desktop and phone-sized signed-in axe scans have no WCAG A/AA
   violations.
4. Confirm the measured authenticated household-list p95 is below 500 ms and
   the warmed Expo web shell is visible within three seconds.
5. Run `bin/local-server smoke`, `bin/local-server report`, and create a backup.

These browser timings are repeatable regression budgets, not physical-device
certification or long-running load tests.

## Manual beta acceptance

The repository owner must record the following outside automated CI:

- two physical devices complete the Phase 2–5 workflows on the trusted LAN;
- VoiceOver and TalkBack complete registration, household switching, inventory,
  shopping, alerts, and destructive confirmation flows;
- text at 200% remains usable and every primary target is at least 44×44 points;
- foreground/background, airplane-mode, token-expiry, and five-minute reconnect
  behavior converges without losing committed changes;
- a current backup restores on an isolated environment and an encrypted copy
  exists off the host;
- the host firewall, OS, Docker runtime, disk capacity, and power expectations
  are reviewed; and
- weekly evidence supports acceptable crash-free use and failed-sync behavior.

Phase 6 cannot be declared fully accepted until the physical-device checklist
and multi-week household evidence are complete.
