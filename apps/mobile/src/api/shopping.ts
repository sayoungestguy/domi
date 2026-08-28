import { apiRequest } from './client';
import type { ShoppingEntry, ShoppingList, ShoppingTrip } from './types';

export type ShoppingEntryInput = {
  name?: string;
  quantity?: number | null;
  note?: string | null;
  inventoryItemId?: string;
};

export function getShoppingList(householdId: string): Promise<{ shoppingList: ShoppingList }> {
  return apiRequest(`/api/v1/households/${householdId}/shopping-list`);
}

export function getShoppingTrips(householdId: string): Promise<{ trips: ShoppingTrip[] }> {
  return apiRequest(`/api/v1/households/${householdId}/shopping-trips`);
}

export function completeShoppingTrip(
  householdId: string,
  restockInventoryItems: boolean,
  idempotencyKey: string,
): Promise<{ trip: ShoppingTrip; shoppingList: ShoppingList }> {
  return apiRequest(`/api/v1/households/${householdId}/shopping-list/complete`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: { restockInventoryItems },
  });
}

export function createShoppingEntry(
  householdId: string,
  input: ShoppingEntryInput,
  idempotencyKey = createShoppingIdempotencyKey(),
): Promise<{ entry: ShoppingEntry }> {
  return apiRequest(`/api/v1/households/${householdId}/shopping-list/entries`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: { shoppingEntry: input },
  });
}

export function updateShoppingEntry(
  householdId: string,
  entry: ShoppingEntry,
  input: ShoppingEntryInput,
): Promise<{ entry: ShoppingEntry }> {
  return apiRequest(
    `/api/v1/households/${householdId}/shopping-list/entries/${entry.id}`,
    {
      method: 'PATCH',
      headers: { 'If-Match': String(entry.version) },
      body: { shoppingEntry: input },
    },
  );
}

export function setShoppingEntryPurchased(
  householdId: string,
  entry: ShoppingEntry,
  purchased: boolean,
): Promise<{ entry: ShoppingEntry }> {
  return apiRequest(
    `/api/v1/households/${householdId}/shopping-list/entries/${entry.id}/purchased`,
    {
      method: 'PATCH',
      headers: { 'If-Match': String(entry.version) },
      body: { purchased },
    },
  );
}

export function removeShoppingEntry(householdId: string, entry: ShoppingEntry): Promise<void> {
  return apiRequest(`/api/v1/households/${householdId}/shopping-list/entries/${entry.id}`, {
    method: 'DELETE',
    headers: { 'If-Match': String(entry.version) },
  });
}

export function updateShoppingPreference(
  householdId: string,
  autoAddOutItems: boolean,
): Promise<{ autoAddOutItems: boolean }> {
  return apiRequest(`/api/v1/households/${householdId}/shopping-preference`, {
    method: 'PATCH',
    body: { autoAddOutItems },
  });
}

export function createShoppingIdempotencyKey() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
