import { apiRequest } from './client';
import type { HouseholdNotification, NotificationPreference } from './types';

export function listNotifications(householdId: string) {
  return apiRequest<{ notifications: HouseholdNotification[]; unreadCount: number }>(
    `/api/v1/households/${householdId}/notifications`,
  );
}

export function markNotificationRead(householdId: string, notificationId: string) {
  return apiRequest<{ notification: HouseholdNotification }>(
    `/api/v1/households/${householdId}/notifications/${notificationId}/read`,
    { method: 'PATCH' },
  );
}

export function markAllNotificationsRead(householdId: string) {
  return apiRequest<void>(`/api/v1/households/${householdId}/notifications/read-all`, {
    method: 'PATCH',
  });
}

export function getNotificationPreference(householdId: string) {
  return apiRequest<{ notificationPreference: NotificationPreference }>(
    `/api/v1/households/${householdId}/notification-preference`,
  );
}

export function updateNotificationPreference(
  householdId: string,
  notificationPreference: NotificationPreference,
) {
  return apiRequest<{ notificationPreference: NotificationPreference }>(
    `/api/v1/households/${householdId}/notification-preference`,
    { method: 'PATCH', body: { notificationPreference } },
  );
}
