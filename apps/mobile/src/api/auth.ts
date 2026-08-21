import { apiRequest } from './client';
import type { AuthenticatedResponse, User } from './types';

export function register(input: {
  email: string;
  displayName: string;
  password: string;
  passwordConfirmation: string;
}): Promise<{ user: User; verificationRequired: true }> {
  return apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: { account: input },
    authenticated: false,
  });
}

export function signIn(email: string, password: string): Promise<AuthenticatedResponse> {
  return apiRequest('/api/v1/auth/session', {
    method: 'POST',
    body: { session: { email, password } },
    authenticated: false,
  });
}

export function verifyEmail(token: string): Promise<AuthenticatedResponse> {
  return apiRequest('/api/v1/auth/email-verification', {
    method: 'POST',
    body: { token },
    authenticated: false,
  });
}

export function resendVerification(email: string): Promise<void> {
  return apiRequest('/api/v1/auth/email-verification/resend', {
    method: 'POST',
    body: { email },
    authenticated: false,
  });
}

export function requestPasswordReset(email: string): Promise<void> {
  return apiRequest('/api/v1/auth/password-reset', {
    method: 'POST',
    body: { email },
    authenticated: false,
  });
}

export function resetPassword(
  token: string,
  password: string,
  passwordConfirmation: string,
): Promise<AuthenticatedResponse> {
  return apiRequest('/api/v1/auth/password-reset', {
    method: 'PATCH',
    body: { token, password, passwordConfirmation },
    authenticated: false,
  });
}

export function getMe(): Promise<{ user: User }> {
  return apiRequest('/api/v1/me');
}

export function signOut(): Promise<void> {
  return apiRequest('/api/v1/auth/session', { method: 'DELETE' });
}
