import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HouseholdChangedEvent } from '../api/types';
import {
  clearRealtimeCursors,
  loadRealtimeCursor,
  processHouseholdEvent,
  saveRealtimeCursor,
} from './realtimeCursor';

function event(sequence: number): HouseholdChangedEvent {
  return {
    type: 'household.changed',
    schemaVersion: 1,
    eventId: `event-${sequence}`,
    householdId: 'household-1',
    sequence,
    occurredAt: '2026-08-29T00:00:00Z',
    resource: 'inventory',
    action: 'inventory.item_updated',
    subject: { type: 'InventoryItem', id: 'item-1', version: sequence },
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('deduplicates delivery and detects a missing household sequence', async () => {
  await expect(processHouseholdEvent(event(1))).resolves.toEqual({ duplicate: false, gap: false });
  await expect(processHouseholdEvent(event(1))).resolves.toEqual({ duplicate: true, gap: false });
  await expect(processHouseholdEvent(event(3))).resolves.toEqual({ duplicate: false, gap: true });
  expect(await loadRealtimeCursor('household-1')).toBe(3);
});

test('authoritative synchronization never moves a cursor backwards and sign-out clears it', async () => {
  await saveRealtimeCursor('household-1', 8);
  await saveRealtimeCursor('household-1', 5);
  expect(await loadRealtimeCursor('household-1')).toBe(8);

  await clearRealtimeCursors();
  expect(await loadRealtimeCursor('household-1')).toBe(0);
});
