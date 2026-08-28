import { apiRequest } from './client';
import type { RealtimeState } from './types';

export function getRealtimeState(
  householdId: string,
): Promise<{ realtimeState: RealtimeState }> {
  return apiRequest(`/api/v1/households/${householdId}/realtime-state`);
}
