import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import {
  getNotificationPreference,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreference,
} from '../../api/notifications';
import type { Household, HouseholdNotification, NotificationPreference, User } from '../../api/types';
import { NotificationsScreen } from './NotificationsScreen';

jest.mock('../../api/notifications');

const user: User = {
  id: 'user-1',
  email: 'maya@example.com',
  displayName: 'Maya',
  emailVerified: true,
  createdAt: '2026-08-01T00:00:00Z',
};
const household: Household = {
  id: 'household-1',
  name: 'Home',
  timezone: 'Etc/UTC',
  role: 'member',
  version: 0,
  createdAt: '2026-08-01T00:00:00Z',
};
const preference: NotificationPreference = {
  memberJoined: true,
  shoppingEntryAdded: true,
  shoppingTripCompleted: true,
};
const notification: HouseholdNotification = {
  id: 'notification-1',
  kind: 'shopping_entry_added',
  title: 'Shopping list updated',
  body: 'Maya added Milk to shopping.',
  readAt: null,
  actor: user,
  subjectType: 'ShoppingEntry',
  subjectId: 'entry-1',
  createdAt: '2026-08-30T00:00:00Z',
};

const listMock = listNotifications as jest.MockedFunction<typeof listNotifications>;
const getPreferenceMock = getNotificationPreference as jest.MockedFunction<
  typeof getNotificationPreference
>;
const markReadMock = markNotificationRead as jest.MockedFunction<typeof markNotificationRead>;
const markAllMock = markAllNotificationsRead as jest.MockedFunction<
  typeof markAllNotificationsRead
>;
const updatePreferenceMock = updateNotificationPreference as jest.MockedFunction<
  typeof updateNotificationPreference
>;

beforeEach(() => {
  jest.clearAllMocks();
  listMock.mockResolvedValue({ notifications: [notification], unreadCount: 1 });
  getPreferenceMock.mockResolvedValue({ notificationPreference: preference });
  markReadMock.mockResolvedValue({
    notification: { ...notification, readAt: '2026-08-30T00:01:00Z' },
  });
  markAllMock.mockResolvedValue(undefined);
  updatePreferenceMock.mockImplementation(async (_householdId, next) => ({
    notificationPreference: next,
  }));
});

test('shows the private inbox and marks one notification read', async () => {
  await render(<NotificationsScreen household={household} />);

  expect(await screen.findByText('Maya added Milk to shopping.')).toBeTruthy();
  expect(screen.getByText('1 unread')).toBeTruthy();
  await fireEvent.press(screen.getByText('Mark read'));

  await waitFor(() => expect(markReadMock).toHaveBeenCalledWith(household.id, notification.id));
  expect(screen.getByText('0 unread')).toBeTruthy();
  expect(screen.queryByText('Mark read')).toBeNull();
});

test('persists category preferences without a push provider', async () => {
  await render(<NotificationsScreen household={household} />);
  await screen.findByText('Notification preferences');

  await fireEvent(screen.getByLabelText('New shopping entries'), 'valueChange', false);

  await waitFor(() =>
    expect(updatePreferenceMock).toHaveBeenCalledWith(household.id, {
      ...preference,
      shoppingEntryAdded: false,
    }),
  );
  expect(screen.getByText(/No data is sent to a push provider/)).toBeTruthy();
});

test('marks every notification read in one action', async () => {
  await render(<NotificationsScreen household={household} />);
  await fireEvent.press(await screen.findByText('Mark all read'));

  await waitFor(() => expect(markAllMock).toHaveBeenCalledWith(household.id));
  expect(screen.getByText('0 unread')).toBeTruthy();
});
