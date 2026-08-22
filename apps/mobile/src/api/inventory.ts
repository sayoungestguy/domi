import { apiRequest } from './client';
import type {
  Category,
  InventoryDashboard,
  InventoryItem,
  InventoryStatus,
  InventoryWarning,
  ShoppingEntry,
} from './types';

export type InventoryItemInput = {
  name?: string;
  status?: InventoryStatus;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  categoryId?: string | null;
};

export function listCategories(householdId: string): Promise<{ categories: Category[] }> {
  return apiRequest(`/api/v1/households/${householdId}/categories`);
}

export function createCategory(householdId: string, name: string): Promise<{ category: Category }> {
  return apiRequest(`/api/v1/households/${householdId}/categories`, {
    method: 'POST',
    body: { category: { name } },
  });
}

export function listInventoryItems(
  householdId: string,
  filters: { query?: string; status?: InventoryStatus; archived?: boolean } = {},
): Promise<{ items: InventoryItem[] }> {
  const query = new URLSearchParams();
  if (filters.query) query.set('query', filters.query);
  if (filters.status) query.set('status', filters.status);
  if (filters.archived) query.set('archived', 'true');
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiRequest(`/api/v1/households/${householdId}/inventory-items${suffix}`);
}

export function getInventoryDashboard(householdId: string): Promise<InventoryDashboard> {
  return apiRequest(`/api/v1/households/${householdId}/inventory/summary`);
}

export function createInventoryItem(
  householdId: string,
  input: InventoryItemInput,
): Promise<{ item: InventoryItem; warnings: InventoryWarning[] }> {
  return apiRequest(`/api/v1/households/${householdId}/inventory-items`, {
    method: 'POST',
    body: { inventoryItem: input },
  });
}

export function updateInventoryItem(
  householdId: string,
  item: InventoryItem,
  input: InventoryItemInput,
): Promise<{ item: InventoryItem; warnings: InventoryWarning[] }> {
  return apiRequest(`/api/v1/households/${householdId}/inventory-items/${item.id}`, {
    method: 'PATCH',
    headers: { 'If-Match': String(item.version) },
    body: { inventoryItem: input },
  });
}

export function changeInventoryStatus(
  householdId: string,
  item: InventoryItem,
  status: InventoryStatus,
): Promise<{
  item: InventoryItem;
  shopping: {
    automaticallyAdded: boolean;
    shouldPrompt: boolean;
    entry: ShoppingEntry | null;
  };
}> {
  return apiRequest(`/api/v1/households/${householdId}/inventory-items/${item.id}/status`, {
    method: 'PATCH',
    headers: { 'If-Match': String(item.version) },
    body: { status },
  });
}

export function setInventoryArchived(
  householdId: string,
  item: InventoryItem,
  archived: boolean,
): Promise<{ item: InventoryItem }> {
  const action = archived ? 'archive' : 'restore';
  return apiRequest(`/api/v1/households/${householdId}/inventory-items/${item.id}/${action}`, {
    method: 'POST',
    headers: { 'If-Match': String(item.version) },
  });
}
