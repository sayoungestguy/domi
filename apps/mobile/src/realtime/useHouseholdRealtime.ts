import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getRealtimeState } from '../api/realtime';
import type { HouseholdChangedEvent } from '../api/types';
import { processHouseholdEvent, saveRealtimeCursor } from '../storage/realtimeCursor';
import { loadSession } from '../storage/sessionStore';
import { subscribeToHousehold } from './householdRealtime';

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'gap';

export function useHouseholdRealtime(householdId?: string) {
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!householdId) {
      return;
    }
    const activeHouseholdId = householdId;

    let stopped = false;
    let connected = false;
    let disconnect: (() => void) | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const invalidate = () => setRevision((current) => current + 1);

    async function synchronize() {
      try {
        const response = await getRealtimeState(activeHouseholdId);
        await saveRealtimeCursor(activeHouseholdId, response.realtimeState.currentSequence);
        if (!stopped) {
          setStatus('connected');
          invalidate();
        }
        return true;
      } catch {
        if (!stopped) setStatus('disconnected');
        return false;
      }
    }

    async function receive(event: HouseholdChangedEvent) {
      if (event.householdId !== activeHouseholdId || event.schemaVersion !== 1) return;
      const result = await processHouseholdEvent(event);
      if (stopped || result.duplicate) return;
      setStatus(result.gap ? 'gap' : 'connected');
      invalidate();
    }

    async function connect() {
      if (stopped) return;
      setStatus('connecting');
      const session = await loadSession();
      if (!session || stopped) {
        setStatus('disconnected');
        return;
      }
      disconnect?.();
      disconnect = subscribeToHousehold({
        householdId: activeHouseholdId,
        token: session.accessToken,
        onConnected: () => {
          connected = true;
          void synchronize();
        },
        onDisconnected: () => {
          connected = false;
          if (!stopped) setStatus('disconnected');
        },
        onRejected: () => {
          connected = false;
          if (stopped) return;
          setStatus('disconnected');
          retryTimer = setTimeout(() => {
            void synchronize().then((refreshed) => {
              if (refreshed) void connect();
            });
          }, 1_000);
        },
        onEvent: (event) => void receive(event),
      });
    }

    void connect();
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      void synchronize().then((refreshed) => {
        if (refreshed && !connected) void connect();
      });
    });

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      appStateSubscription.remove();
      disconnect?.();
    };
  }, [householdId]);

  return { status: householdId ? status : 'idle', revision };
}
