# Domi mobile

Expo SDK 57 and React Native 0.86 client. It provides account registration,
verification, secure sessions, shared-household management, inventory, the
shared shopping list, and Phase 4 trip completion/history. Inventory reads are cached by household in AsyncStorage for a clearly
labelled offline view; authentication credentials remain in SecureStore.

From the repository root, run `bin/setup`, then `bin/dev`. By default, iOS and
web use `http://localhost:3000`; the Android emulator uses
`http://10.0.2.2:3000`. Override either with `EXPO_PUBLIC_API_URL`.

Checks:

```sh
npm run check
```

The check gate runs Jest behavior tests, TypeScript, Expo lint, and an iOS
production export. Run only the behavior tests with `npm test`.

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
