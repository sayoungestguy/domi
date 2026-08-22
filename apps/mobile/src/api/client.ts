import { apiBaseUrl } from './config';
import type { SessionTokens } from './types';
import { clearSession, loadSession, saveSession } from '../storage/sessionStore';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  authenticated?: boolean;
  headers?: Record<string, string>;
};

type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshInFlight: Promise<SessionTokens> | null = null;
let unauthorizedHandler: (() => void) | undefined;

export function setUnauthorizedHandler(handler: () => void): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = undefined;
    }
  };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const authenticated = options.authenticated ?? true;
  const session = authenticated ? await loadSession() : null;
  const response = await performRequest(path, options, session?.accessToken);

  if (response.status === 401 && authenticated && session) {
    try {
      const rotated = await refreshSession(session.refreshToken);
      const retry = await performRequest(path, options, rotated.accessToken);
      return parseResponse<T>(retry);
    } catch (error) {
      await clearSession();
      unauthorizedHandler?.();
      throw error;
    }
  }

  return parseResponse<T>(response);
}

async function performRequest(
  path: string,
  options: RequestOptions,
  accessToken?: string,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function refreshSession(refreshToken: string): Promise<SessionTokens> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await performRequest(
        '/api/v1/auth/session/refresh',
        { method: 'POST', body: { refreshToken }, authenticated: false },
      );
      const payload = await parseResponse<{ session: SessionTokens }>(response);
      await saveSession(payload.session);
      return payload.session;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 202) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const envelope = payload as ErrorEnvelope;
    throw new ApiError(
      response.status,
      envelope.error?.code ?? 'request.failed',
      envelope.error?.message ?? 'Domi could not complete that request.',
      envelope.error?.details,
    );
  }

  return payload as T;
}
