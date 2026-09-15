# Domi screen catalogue

Generate the complete catalogue from the repository root:

```sh
npm run e2e:screenshots
```

The command drives the real Expo web client against the isolated Dockerized API
and writes full-page PNG files into:

- `screenshots/chromium/` for desktop Chrome;
- `screenshots/mobile-chromium/` for a Pixel 5-sized Chrome viewport.

The numbered files cover authentication, household creation/joining, inventory,
shopping, trip history, alerts, and owner/member settings. They are evidence
captures, not pixel-diff snapshot assertions. The normal `npm run e2e` suite
excludes the screen-catalog scenario so routine test runs do not rewrite images.
