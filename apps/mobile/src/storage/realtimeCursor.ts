import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HouseholdChangedEvent } from '../api/types';

const CURSOR_INDEX_KEY = 'domi.realtime-cursor-keys.v1';

function cursorKey(householdId: string) {
  return `domi.realtime-cursor.v1.${householdId}`;
}

export async function processHouseholdEvent(event: HouseholdChangedEvent): Promise<{
  duplicate: boolean;
  gap: boolean;
}> {
  const previous = await loadRealtimeCursor(event.householdId);
  if (event.sequence <= previous) {
    return { duplicate: true, gap: false };
  }

  const gap = previous > 0 && event.sequence > previous + 1;
  await saveRealtimeCursor(event.householdId, event.sequence);
  return { duplicate: false, gap };
}

export async function loadRealtimeCursor(householdId: string): Promise<number> {
  const stored = await AsyncStorage.getItem(cursorKey(householdId));
  const parsed = Number(stored);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export async function saveRealtimeCursor(householdId: string, sequence: number): Promise<void> {
  const key = cursorKey(householdId);
  const current = await loadRealtimeCursor(householdId);
  if (sequence < current) return;

  const index = await readCursorIndex();
  await AsyncStorage.multiSet([
    [key, String(sequence)],
    [CURSOR_INDEX_KEY, JSON.stringify(Array.from(new Set([...index, key])))],
  ]);
}

export async function clearRealtimeCursors(): Promise<void> {
  const index = await readCursorIndex();
  await AsyncStorage.multiRemove([...index, CURSOR_INDEX_KEY]);
}

async function readCursorIndex(): Promise<string[]> {
  const stored = await AsyncStorage.getItem(CURSOR_INDEX_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.every((value) => typeof value === 'string') ? parsed : [];
  } catch {
    return [];
  }
}
