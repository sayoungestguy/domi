import type { SessionTokens } from '../api/types';

const SESSION_KEY = 'domi.mobile-session.v1';

export async function loadSession(): Promise<SessionTokens | null> {
  const value = globalThis.sessionStorage?.getItem(SESSION_KEY);
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    return isSessionTokens(parsed) ? parsed : null;
  } catch {
    await clearSession();
    return null;
  }
}

export async function saveSession(session: SessionTokens): Promise<void> {
  globalThis.sessionStorage?.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  globalThis.sessionStorage?.removeItem(SESSION_KEY);
}

function isSessionTokens(value: unknown): value is SessionTokens {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.accessToken === 'string' &&
    typeof candidate.refreshToken === 'string' &&
    typeof candidate.accessExpiresAt === 'string' &&
    typeof candidate.refreshExpiresAt === 'string'
  );
}
