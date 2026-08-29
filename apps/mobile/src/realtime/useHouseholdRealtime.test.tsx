import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { getRealtimeState } from '../api/realtime';
import type { HouseholdChangedEvent } from '../api/types';
import { processHouseholdEvent, saveRealtimeCursor } from '../storage/realtimeCursor';
import { loadSession } from '../storage/sessionStore';
import { subscribeToHousehold } from './householdRealtime';
import { useHouseholdRealtime } from './useHouseholdRealtime';

jest.mock('../api/realtime');
jest.mock('../storage/realtimeCursor');
jest.mock('../storage/sessionStore');
jest.mock('./householdRealtime');

const getStateMock = getRealtimeState as jest.MockedFunction<typeof getRealtimeState>;
const processEventMock = processHouseholdEvent as jest.MockedFunction<typeof processHouseholdEvent>;
const saveCursorMock = saveRealtimeCursor as jest.MockedFunction<typeof saveRealtimeCursor>;
const loadSessionMock = loadSession as jest.MockedFunction<typeof loadSession>;
const subscribeMock = subscribeToHousehold as jest.MockedFunction<typeof subscribeToHousehold>;

test('connection, detected gaps, and foregrounding invalidate authoritative reads', async () => {
  let callbacks: Parameters<typeof subscribeToHousehold>[0] | undefined;
  let appStateCallback: ((state: string) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, callback) => {
    appStateCallback = callback as (state: string) => void;
    return { remove: jest.fn() };
  });
  loadSessionMock.mockResolvedValue({
    accessToken: 'token',
    refreshToken: 'refresh',
    accessExpiresAt: '2026-08-29T01:00:00Z',
    refreshExpiresAt: '2026-09-01T00:00:00Z',
  });
  getStateMock.mockResolvedValue({
    realtimeState: { householdId: 'household-1', currentSequence: 5 },
  });
  saveCursorMock.mockResolvedValue();
  processEventMock.mockResolvedValue({ duplicate: false, gap: true });
  subscribeMock.mockImplementation((options) => {
    callbacks = options;
    return jest.fn();
  });

  const { result } = await renderHook(() => useHouseholdRealtime('household-1'));
  await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));

  await act(async () => callbacks?.onConnected());
  await waitFor(() => expect(result.current).toEqual({ status: 'connected', revision: 1 }));
  expect(saveCursorMock).toHaveBeenCalledWith('household-1', 5);

  const event = {
    householdId: 'household-1',
    schemaVersion: 1,
  } as HouseholdChangedEvent;
  await act(async () => callbacks?.onEvent(event));
  await waitFor(() => expect(result.current).toEqual({ status: 'gap', revision: 2 }));

  await act(async () => appStateCallback?.('active'));
  await waitFor(() => expect(result.current).toEqual({ status: 'connected', revision: 3 }));
  expect(getStateMock).toHaveBeenCalledTimes(2);
});
