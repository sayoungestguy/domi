import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ShoppingList, ShoppingTrip } from '../api/types';

export type ShoppingSnapshot = {
  householdId: string;
  list: ShoppingList;
  trips: ShoppingTrip[];
  savedAt: string;
};

const CACHE_INDEX_KEY = 'domi.shopping-cache-keys.v1';

function cacheKey(householdId: string) {
  return `domi.shopping-cache.v1.${householdId}`;
}

export async function loadShoppingSnapshot(householdId: string): Promise<ShoppingSnapshot | null> {
  const stored = await AsyncStorage.getItem(cacheKey(householdId));
  if (!stored) return null;
  try {
    const snapshot = JSON.parse(stored) as ShoppingSnapshot;
    return snapshot.householdId === householdId ? snapshot : null;
  } catch {
    await AsyncStorage.removeItem(cacheKey(householdId));
    return null;
  }
}

export async function saveShoppingSnapshot(snapshot: ShoppingSnapshot): Promise<void> {
  const key = cacheKey(snapshot.householdId);
  const index = await readCacheIndex();
  await AsyncStorage.multiSet([
    [key, JSON.stringify(snapshot)],
    [CACHE_INDEX_KEY, JSON.stringify(Array.from(new Set([...index, key])))],
  ]);
}

export async function clearShoppingSnapshots(): Promise<void> {
  const index = await readCacheIndex();
  await AsyncStorage.multiRemove([...index, CACHE_INDEX_KEY]);
}

async function readCacheIndex(): Promise<string[]> {
  const stored = await AsyncStorage.getItem(CACHE_INDEX_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.every((value) => typeof value === 'string') ? parsed : [];
  } catch {
    return [];
  }
}
