import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import { getMe, signOut } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import type { AuthenticatedResponse, User } from '../api/types';
import { AuthScreen, type AuthIntent } from '../features/auth/AuthScreen';
import { HouseholdsScreen } from '../features/households/HouseholdsScreen';
import { clearSession, loadSession, saveSession } from '../storage/sessionStore';
import { clearInventorySnapshots } from '../storage/inventoryCache';
import { colors, spacing } from '../theme/tokens';

type AuthState =
  | { status: 'booting' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: User };

export function AppRoot() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'booting' });
  const [intent, setIntent] = useState<AuthIntent>();

  useEffect(() => {
    const unsubscribeUnauthorized = setUnauthorizedHandler(() => {
      void clearInventorySnapshots();
      setAuthState({ status: 'signed-out' });
    });

    void (async () => {
      const session = await loadSession();
      if (!session) {
        setAuthState({ status: 'signed-out' });
        return;
      }

      try {
        const response = await getMe();
        setAuthState({ status: 'signed-in', user: response.user });
      } catch {
        await clearSession();
        setAuthState({ status: 'signed-out' });
      }
    })();

    return unsubscribeUnauthorized;
  }, []);

  useEffect(() => {
    function handleUrl(url: string | null) {
      const parsed = url ? parseAuthIntent(url) : undefined;
      if (parsed) {
        setIntent(parsed);
      }
    }

    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  async function handleAuthenticated(response: AuthenticatedResponse) {
    await saveSession(response.session);
    setAuthState({ status: 'signed-in', user: response.user });
    if (intent?.kind !== 'join') {
      setIntent(undefined);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      await clearSession();
      await clearInventorySnapshots();
      setIntent(undefined);
      setAuthState({ status: 'signed-out' });
    }
  }

  if (authState.status === 'booting') {
    return (
      <View accessibilityLiveRegion="polite" style={styles.loading}>
        <ActivityIndicator color={colors.brand[600]} size="large" />
        <Text style={styles.loadingText}>Opening Domi…</Text>
      </View>
    );
  }

  if (authState.status === 'signed-out') {
    const intentKey = intent ? `${intent.kind}:${intent.token}` : 'default';
    return <AuthScreen intent={intent} key={intentKey} onAuthenticated={handleAuthenticated} />;
  }

  return (
    <HouseholdsScreen
      initialJoinToken={intent?.kind === 'join' ? intent.token : undefined}
      onJoinIntentConsumed={() => setIntent(undefined)}
      onSignOut={handleSignOut}
      user={authState.user}
    />
  );
}

function parseAuthIntent(url: string): AuthIntent | undefined {
  try {
    const parsed = new URL(url);
    const route = parsed.hostname || parsed.pathname.replace(/^\//, '');
    const token = parsed.searchParams.get('token');
    if (!token) {
      return undefined;
    }

    if (route === 'verify-email') {
      return { kind: 'verify-email', token };
    }
    if (route === 'reset-password') {
      return { kind: 'reset-password', token };
    }
    if (route === 'join') {
      return { kind: 'join', token };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    flex: 1,
    gap: spacing[4],
    justifyContent: 'center',
  },
  loadingText: { color: colors.text.secondary, fontSize: 16, lineHeight: 24 },
});
