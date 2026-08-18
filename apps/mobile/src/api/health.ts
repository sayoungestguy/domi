import { Platform } from 'react-native';

export type ApiHealth = {
  status: 'ok';
  service: 'domi-api';
  version: string;
};

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const developmentBaseUrl = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

export const apiBaseUrl = configuredBaseUrl ?? developmentBaseUrl;

export async function getApiHealth(): Promise<ApiHealth> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/health`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`The API returned HTTP ${response.status}.`);
    }

    const body: unknown = await response.json();

    if (!isApiHealth(body)) {
      throw new Error('The API returned an unexpected health response.');
    }

    return body;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The API connection timed out.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isApiHealth(value: unknown): value is ApiHealth {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.status === 'ok' &&
    candidate.service === 'domi-api' &&
    typeof candidate.version === 'string'
  );
}
