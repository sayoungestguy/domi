import { apiRequest } from './client';
import { completeShoppingTrip, getShoppingTrips } from './shopping';

jest.mock('./client', () => ({ apiRequest: jest.fn() }));

const requestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => {
  requestMock.mockReset();
});

test('completion sends the explicit restock choice and stable idempotency key', async () => {
  requestMock.mockResolvedValue({});

  await completeShoppingTrip('household-1', true, 'finish-key-123');

  expect(requestMock).toHaveBeenCalledWith(
    '/api/v1/households/household-1/shopping-list/complete',
    {
      method: 'POST',
      headers: { 'Idempotency-Key': 'finish-key-123' },
      body: { restockInventoryItems: true },
    },
  );
});

test('trip history is requested within the household boundary', async () => {
  requestMock.mockResolvedValue({ trips: [] });

  await getShoppingTrips('household-1');

  expect(requestMock).toHaveBeenCalledWith('/api/v1/households/household-1/shopping-trips');
});
