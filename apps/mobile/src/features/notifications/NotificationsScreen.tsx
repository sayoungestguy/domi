import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import {
  getNotificationPreference,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreference,
} from '../../api/notifications';
import type {
  Household,
  HouseholdNotification,
  NotificationPreference,
} from '../../api/types';
import { Button, Card, Message, sharedStyles } from '../../components/ui';
import { colors, spacing } from '../../theme/tokens';

type Props = { household: Household; refreshSignal?: number };

const defaultPreference: NotificationPreference = {
  memberJoined: true,
  shoppingEntryAdded: true,
  shoppingTripCompleted: true,
};

export function NotificationsScreen({ household, refreshSignal = 0 }: Props) {
  const [notifications, setNotifications] = useState<HouseholdNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preference, setPreference] = useState(defaultPreference);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [notificationResponse, preferenceResponse] = await Promise.all([
        listNotifications(household.id),
        getNotificationPreference(household.id),
      ]);
      setNotifications(notificationResponse.notifications);
      setUnreadCount(notificationResponse.unreadCount);
      setPreference(preferenceResponse.notificationPreference);
      setError(undefined);
    } catch (loadError) {
      setError(messageFor(loadError));
    }
  }, [household.id]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load, refreshSignal]);

  async function markRead(notification: HouseholdNotification) {
    try {
      const response = await markNotificationRead(household.id, notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? response.notification : item)),
      );
      setUnreadCount((current) => Math.max(0, current - (notification.readAt ? 0 : 1)));
    } catch (actionError) {
      setError(messageFor(actionError));
    }
  }

  async function markAllRead() {
    setBusy(true);
    try {
      await markAllNotificationsRead(household.id);
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
      setUnreadCount(0);
    } catch (actionError) {
      setError(messageFor(actionError));
    } finally {
      setBusy(false);
    }
  }

  async function savePreference(next: NotificationPreference) {
    const previous = preference;
    setPreference(next);
    try {
      const response = await updateNotificationPreference(household.id, next);
      setPreference(response.notificationPreference);
      setError(undefined);
    } catch (actionError) {
      setPreference(previous);
      setError(messageFor(actionError));
    }
  }

  return (
    <>
      {error ? <Message type="error">{error}</Message> : null}
      <Card>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={sharedStyles.sectionTitle}>Notifications</Text>
            <Text accessibilityLiveRegion="polite" style={sharedStyles.secondary}>
              {unreadCount} unread
            </Text>
          </View>
          {unreadCount > 0 ? (
            <Button label="Mark all read" loading={busy} onPress={() => void markAllRead()} variant="secondary" />
          ) : null}
        </View>
        {notifications.length === 0 ? (
          <Text style={sharedStyles.secondary}>No notifications yet.</Text>
        ) : (
          notifications.map((notification) => (
            <View
              accessibilityLabel={`${notification.readAt ? 'Read' : 'Unread'} notification: ${notification.title}`}
              key={notification.id}
              style={[styles.notification, !notification.readAt && styles.unread]}
              testID="notification-item"
            >
              <Text style={sharedStyles.sectionTitle}>{notification.title}</Text>
              <Text style={sharedStyles.body}>{notification.body}</Text>
              <Text style={sharedStyles.secondary}>
                {new Date(notification.createdAt).toLocaleString()}
              </Text>
              {!notification.readAt ? (
                <Button label="Mark read" onPress={() => void markRead(notification)} variant="text" />
              ) : null}
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={sharedStyles.sectionTitle}>Notification preferences</Text>
        <Text style={sharedStyles.secondary}>
          These control Domi’s private in-app inbox. No data is sent to a push provider.
        </Text>
        <PreferenceSwitch
          label="New household members"
          onValueChange={(memberJoined) => void savePreference({ ...preference, memberJoined })}
          value={preference.memberJoined}
        />
        <PreferenceSwitch
          label="New shopping entries"
          onValueChange={(shoppingEntryAdded) =>
            void savePreference({ ...preference, shoppingEntryAdded })
          }
          value={preference.shoppingEntryAdded}
        />
        <PreferenceSwitch
          label="Completed shopping trips"
          onValueChange={(shoppingTripCompleted) =>
            void savePreference({ ...preference, shoppingTripCompleted })
          }
          value={preference.shoppingTripCompleted}
        />
      </Card>
    </>
  );
}

function PreferenceSwitch({
  label,
  onValueChange,
  value,
}: {
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.preferenceRow}>
      <Text style={sharedStyles.body}>{label}</Text>
      <Switch accessibilityLabel={label} onValueChange={onValueChange} value={value} />
    </View>
  );
}

function messageFor(error: unknown) {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Domi could not load notifications.';
}

const styles = StyleSheet.create({
  headingRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[4], justifyContent: 'space-between' },
  headingCopy: { flex: 1, gap: spacing[1] },
  notification: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing[2], paddingTop: spacing[4] },
  unread: { borderLeftColor: colors.brand[600], borderLeftWidth: 4, paddingLeft: spacing[3] },
  preferenceRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[4], justifyContent: 'space-between', minHeight: 48 },
});
