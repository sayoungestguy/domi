# Domi mobile

Expo SDK 57 and React Native 0.86 client. Phase 1 provides account registration,
verification, sign-in, password recovery, secure session renewal, deep links,
and shared-household management.

From the repository root, run `bin/setup`, then `bin/dev`. By default, iOS and
web use `http://localhost:3000`; the Android emulator uses
`http://10.0.2.2:3000`. Override either with `EXPO_PUBLIC_API_URL`.

Checks:

```sh
npm run check
```

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
