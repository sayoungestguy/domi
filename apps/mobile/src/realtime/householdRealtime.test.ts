import { createConsumer } from '@rails/actioncable';

import { cableUrl } from '../api/config';
import type { HouseholdChangedEvent } from '../api/types';
import { subscribeToHousehold } from './householdRealtime';

jest.mock('@rails/actioncable', () => ({ createConsumer: jest.fn() }));

const createConsumerMock = createConsumer as jest.MockedFunction<typeof createConsumer>;

test('subscribes with scoped credentials, forwards events, and fully disconnects', () => {
  const unsubscribe = jest.fn();
  const disconnect = jest.fn();
  let callbacks: Record<string, (...arguments_: never[]) => void> = {};
  const create = jest.fn((parameters, handlers) => {
    callbacks = handlers;
    expect(parameters).toEqual({
      channel: 'HouseholdChannel',
      householdId: 'household-1',
      token: 'access-token',
    });
    return { unsubscribe };
  });
  createConsumerMock.mockReturnValue({ subscriptions: { create }, disconnect } as never);
  const onConnected = jest.fn();
  const onEvent = jest.fn();
  const event = { eventId: 'event-1' } as HouseholdChangedEvent;

  const stop = subscribeToHousehold({
    householdId: 'household-1',
    token: 'access-token',
    onConnected,
    onDisconnected: jest.fn(),
    onRejected: jest.fn(),
    onEvent,
  });
  callbacks.connected?.();
  callbacks.received?.(event as never);
  stop();

  expect(createConsumerMock).toHaveBeenCalledWith(cableUrl);
  expect(onConnected).toHaveBeenCalledTimes(1);
  expect(onEvent).toHaveBeenCalledWith(event);
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(disconnect).toHaveBeenCalledTimes(1);
});
