import { createConsumer } from '@rails/actioncable';

import { cableUrl } from '../api/config';
import type { HouseholdChangedEvent } from '../api/types';

type Options = {
  householdId: string;
  token: string;
  onConnected: () => void;
  onDisconnected: () => void;
  onRejected: () => void;
  onEvent: (event: HouseholdChangedEvent) => void;
};

export function subscribeToHousehold(options: Options): () => void {
  const consumer = createConsumer(cableUrl);
  const subscription = consumer.subscriptions.create(
    {
      channel: 'HouseholdChannel',
      householdId: options.householdId,
      token: options.token,
    },
    {
      connected: options.onConnected,
      disconnected: options.onDisconnected,
      rejected: options.onRejected,
      received: (event: HouseholdChangedEvent) => options.onEvent(event),
    },
  );

  return () => {
    subscription.unsubscribe();
    consumer.disconnect();
  };
}
