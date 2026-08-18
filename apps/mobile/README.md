# Domi mobile

Expo SDK 57 and React Native 0.86 client. The Phase 0 screen verifies the typed
connection to the Rails API.

From the repository root, run `bin/setup`, then `bin/dev`. By default, iOS and
web use `http://localhost:3000`; the Android emulator uses
`http://10.0.2.2:3000`. Override either with `EXPO_PUBLIC_API_URL`.

Checks:

```sh
npm run typecheck
npm run lint
```

Never put secrets in an `EXPO_PUBLIC_*` variable; Expo embeds those values in the
client bundle.
