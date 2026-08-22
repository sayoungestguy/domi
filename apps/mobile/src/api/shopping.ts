import { apiRequest } from './client';
import type { ShoppingEntry, ShoppingList } from './types';

export type ShoppingEntryInput = {
  name?: string;
  quantity?: number | null;
  note?: string | null;
  inventoryItemId?: string;
};

export function getShoppingList(householdId: string): Promise<{ shoppingList: ShoppingList }> {
  return apiRequest(`/api/v1/households/${householdId}/shopping-list`);
}

export function createShoppingEntry(
  householdId: string,
  input: ShoppingEntryInput,
  idempotencyKey = createIdempotencyKey(),
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

function createIdempotencyKey() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
