import { apiRequest } from './client';

export type PrivacyExport = Record<string, unknown>;

export function getAccountExport() {
  return apiRequest<{ export: PrivacyExport }>('/api/v1/me/export');
}

export function getHouseholdExport(householdId: string) {
  return apiRequest<{ export: PrivacyExport }>(`/api/v1/households/${householdId}/export`);
}

export function deleteHousehold(householdId: string, confirmation: string) {
  return apiRequest<void>(`/api/v1/households/${householdId}`, {
    method: 'DELETE',
    body: { confirmation },
  });
}

export function deleteAccount(currentPassword: string, confirmation: string) {
  return apiRequest<void>('/api/v1/me', {
    method: 'DELETE',
    body: { currentPassword, confirmation },
  });
}
