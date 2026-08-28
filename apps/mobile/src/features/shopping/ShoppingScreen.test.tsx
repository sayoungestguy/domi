import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { listInventoryItems } from '../../api/inventory';
import {
  completeShoppingTrip,
  createShoppingIdempotencyKey,
  getShoppingList,
  getShoppingTrips,
} from '../../api/shopping';
import type { Household, ShoppingList, ShoppingTrip, User } from '../../api/types';
import { ShoppingScreen } from './ShoppingScreen';

jest.mock('../../api/inventory');
jest.mock('../../api/shopping');

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
  role: 'owner',
  version: 0,
  createdAt: '2026-08-01T00:00:00Z',
};
const initialList: ShoppingList = {
  id: 'list-1',
  householdId: household.id,
  remainingCount: 1,
  purchasedCount: 1,
  autoAddOutItems: false,
  updatedAt: '2026-08-25T00:00:00Z',
  entries: [
    {
      id: 'entry-milk',
      householdId: household.id,
      name: 'Milk',
      quantity: 1,
      note: null,
      purchased: true,
      checkedAt: '2026-08-25T00:00:00Z',
      inventoryItemId: 'inventory-milk',
      version: 1,
      addedBy: user,
      updatedBy: user,
      createdAt: '2026-08-25T00:00:00Z',
      updatedAt: '2026-08-25T00:00:00Z',
    },
    {
      id: 'entry-coffee',
      householdId: household.id,
      name: 'Coffee',
      quantity: null,
      note: null,
      purchased: false,
      checkedAt: null,
      inventoryItemId: null,
      version: 0,
      addedBy: user,
      updatedBy: user,
      createdAt: '2026-08-25T00:00:00Z',
      updatedAt: '2026-08-25T00:00:00Z',
    },
  ],
};
const completedList: ShoppingList = {
  ...initialList,
  purchasedCount: 0,
  entries: [initialList.entries[1]],
};
const trip: ShoppingTrip = {
  id: 'trip-1',
  householdId: household.id,
  completedAt: '2026-08-25T00:00:00Z',
  completedBy: user,
  restockInventoryItems: true,
  purchasedCount: 1,
  restockedCount: 1,
  items: [
    {
      id: 'trip-item-1',
      sourceEntryId: 'entry-milk',
      inventoryItemId: 'inventory-milk',
      name: 'Milk',
      quantity: 1,
      note: null,
      checkedAt: '2026-08-25T00:00:00Z',
      restocked: true,
    },
  ],
};

const getListMock = getShoppingList as jest.MockedFunction<typeof getShoppingList>;
const getTripsMock = getShoppingTrips as jest.MockedFunction<typeof getShoppingTrips>;
const listInventoryMock = listInventoryItems as jest.MockedFunction<typeof listInventoryItems>;
const completeMock = completeShoppingTrip as jest.MockedFunction<typeof completeShoppingTrip>;
const keyMock = createShoppingIdempotencyKey as jest.MockedFunction<
  typeof createShoppingIdempotencyKey
>;

beforeEach(() => {
  jest.clearAllMocks();
  getListMock
    .mockResolvedValueOnce({ shoppingList: initialList })
    .mockResolvedValue({ shoppingList: completedList });
  getTripsMock.mockResolvedValueOnce({ trips: [] }).mockResolvedValue({ trips: [trip] });
  listInventoryMock.mockResolvedValue({ items: [] });
  keyMock.mockReturnValue('finish-key-123');
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.text === 'Finish')?.onPress?.();
  });
});

test('failed completion can retry with the same key and preserves unchecked entries', async () => {
  completeMock
    .mockRejectedValueOnce(new Error('Connection lost'))
    .mockResolvedValueOnce({ trip, shoppingList: completedList });

  await render(<ShoppingScreen household={household} />);

  await fireEvent.press(await screen.findByText('Finish shopping'));
  expect(await screen.findByText('Connection lost')).toBeTruthy();
  expect(screen.getByText('Retry finish shopping')).toBeTruthy();
  expect(screen.getByText(/Retrying is safe/)).toBeTruthy();

  await fireEvent.press(screen.getByText('Retry finish shopping'));

  await waitFor(() => expect(completeMock).toHaveBeenCalledTimes(2));
  expect(completeMock.mock.calls[0]).toEqual([household.id, true, 'finish-key-123']);
  expect(completeMock.mock.calls[1]).toEqual([household.id, true, 'finish-key-123']);
  expect(Alert.alert).toHaveBeenCalledWith(
    'Finish shopping?',
    expect.stringContaining('1 unchecked item stays on the list'),
    expect.any(Array),
    expect.objectContaining({ cancelable: true }),
  );
  expect(await screen.findByText('Shopping finished with 1 item.')).toBeTruthy();
  expect(screen.getByText('Coffee')).toBeTruthy();
  expect(screen.getByText('Recent trips')).toBeTruthy();
  expect(screen.getByText('Finished by Maya · 1 restocked')).toBeTruthy();
});

test('completion sends an explicit choice to leave inventory unchanged', async () => {
  completeMock.mockResolvedValue({
    trip: { ...trip, restockInventoryItems: false, restockedCount: 0 },
    shoppingList: completedList,
  });

  await render(<ShoppingScreen household={household} />);
  await screen.findByText('Finish shopping');
  await fireEvent(
    screen.getByLabelText('Mark linked inventory items OK after finishing shopping'),
    'valueChange',
    false,
  );
  await fireEvent.press(screen.getByText('Finish shopping'));

  await waitFor(() =>
    expect(completeMock).toHaveBeenCalledWith(household.id, false, 'finish-key-123'),
  );
  expect(Alert.alert).toHaveBeenCalledWith(
    'Finish shopping?',
    expect.stringContaining('Inventory statuses will stay unchanged'),
    expect.any(Array),
    expect.objectContaining({ cancelable: true }),
  );
});
