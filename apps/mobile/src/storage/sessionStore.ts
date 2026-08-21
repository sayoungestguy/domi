import * as SecureStore from 'expo-secure-store';

import type { SessionTokens } from '../api/types';

const SESSION_KEY = 'domi.mobile-session.v1';

export async function loadSession(): Promise<SessionTokens | null> {
  const value = await SecureStore.getItemAsync(SESSION_KEY);
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return isSessionTokens(parsed) ? parsed : null;
  } catch {
    await clearSession();
    return null;
  }
}

export async function saveSession(session: SessionTokens): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

function isSessionTokens(value: unknown): value is SessionTokens {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.accessToken === 'string' &&
    typeof candidate.refreshToken === 'string' &&
    typeof candidate.accessExpiresAt === 'string' &&
    typeof candidate.refreshExpiresAt === 'string'
  );
}
