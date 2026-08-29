# Domi mobile

Expo SDK 57 and React Native 0.86 client. It provides account registration,
verification, secure sessions, shared-household management, inventory, the
shared shopping list, Phase 4 trip completion/history, and Phase 5 household
realtime invalidation/reconnect recovery. Inventory and shopping reads are cached
by household in AsyncStorage for a clearly labelled offline view; authentication
credentials remain in SecureStore.

From the repository root, run `bin/setup`, then `bin/dev`. By default, iOS and
web use `http://localhost:3000`; the Android emulator uses
`http://10.0.2.2:3000`. Override either with `EXPO_PUBLIC_API_URL`.
The Action Cable URL is derived from that API URL (`ws`/`wss` plus `/cable`).

Checks:

```sh
npm run check
```

The check gate runs Jest behavior tests, TypeScript, Expo lint, and an iOS
production export. Run only the behavior tests with `npm test`.

Expo web is also the browser surface for the root Playwright suite. Browser
sessions use per-tab `sessionStorage`; native sessions continue to use
SecureStore. Run the browser suite from the repository root with `npm run e2e`.

Never put secrets in an `EXPO_PUBLIC_*` variable; Expo embeds those values in the
client bundle. Authentication credentials are stored with `expo-secure-store`,
not AsyncStorage. The registered development scheme is `domi://`, including:

```text
domi://verify-email?token=...
domi://reset-password?token=...
domi://join?token=...
```

Production releases must replace custom-scheme-only links with associated HTTPS
universal/app links.
