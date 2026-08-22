import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Category, InventoryDashboard, InventoryItem } from '../api/types';

export type InventorySnapshot = {
  householdId: string;
  items: InventoryItem[];
  categories: Category[];
  dashboard: InventoryDashboard;
  savedAt: string;
};

const CACHE_INDEX_KEY = 'domi.inventory-cache-keys.v1';

function cacheKey(householdId: string) {
  return `domi.inventory-cache.v1.${householdId}`;
}

export async function loadInventorySnapshot(householdId: string): Promise<InventorySnapshot | null> {
  const stored = await AsyncStorage.getItem(cacheKey(householdId));
  if (!stored) return null;

  try {
    const snapshot = JSON.parse(stored) as InventorySnapshot;
    return snapshot.householdId === householdId ? snapshot : null;
  } catch {
    await AsyncStorage.removeItem(cacheKey(householdId));
    return null;
  }
}

export async function saveInventorySnapshot(snapshot: InventorySnapshot): Promise<void> {
  const key = cacheKey(snapshot.householdId);
  const index = await readCacheIndex();
  await AsyncStorage.multiSet([
    [key, JSON.stringify(snapshot)],
    [CACHE_INDEX_KEY, JSON.stringify(Array.from(new Set([...index, key])))],
  ]);
}

export async function clearInventorySnapshots(): Promise<void> {
  const index = await readCacheIndex();
  await AsyncStorage.multiRemove([...index, CACHE_INDEX_KEY]);
}

async function readCacheIndex(): Promise<string[]> {
  const stored = await AsyncStorage.getItem(CACHE_INDEX_KEY);
  if (!stored) return [];

  try {
    const value: unknown = JSON.parse(stored);
    return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : [];
  } catch {
    return [];
  }
}
