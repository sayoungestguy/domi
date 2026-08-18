import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getApiHealth, type ApiHealth } from './src/api/health';
import { captureError } from './src/telemetry/errorReporter';
import { colors, radii, spacing } from './src/theme/tokens';

type HealthState =
  | { status: 'loading' }
  | { status: 'connected'; health: ApiHealth }
  | { status: 'error'; message: string };

export default function App() {
  const [healthState, setHealthState] = useState<HealthState>({ status: 'loading' });

  const checkConnection = useCallback(async () => {
    setHealthState({ status: 'loading' });

    try {
      const health = await getApiHealth();
      setHealthState({ status: 'connected', health });
    } catch (error) {
      const connectionError =
        error instanceof Error ? error : new Error('The API could not be reached.');
      captureError(connectionError, { operation: 'api.health' });
      setHealthState({
        status: 'error',
        message: connectionError.message,
      });
    }
  }, []);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.brand}>
          Domi
        </Text>
        <Text style={styles.tagline}>Your home, organised.</Text>

        <View accessibilityLiveRegion="polite" style={styles.card}>
          <Text style={styles.cardTitle}>Development connection</Text>
          {healthState.status === 'loading' && (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.brand[600]} />
              <Text style={styles.statusText}>Checking the API…</Text>
            </View>
          )}
          {healthState.status === 'connected' && (
            <View>
              <Text style={[styles.statusText, styles.success]}>API connected</Text>
              <Text style={styles.detail}>
                {healthState.health.service} · {healthState.health.version}
              </Text>
            </View>
          )}
          {healthState.status === 'error' && (
            <View>
              <Text style={[styles.statusText, styles.error]}>API unavailable</Text>
              <Text style={styles.detail}>{healthState.message}</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={healthState.status === 'loading'}
            onPress={() => void checkConnection()}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              healthState.status === 'loading' && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonLabel}>Check again</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing[6],
  },
  brand: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  tagline: {
    color: colors.text.secondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing[8],
    marginTop: spacing[1],
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing[4],
    padding: spacing[5],
  },
  cardTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
  },
  statusText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  success: {
    color: colors.brand[600],
  },
  error: {
    color: colors.status.out,
  },
  detail: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing[1],
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.brand[600],
    borderRadius: radii.control,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 132,
    paddingHorizontal: spacing[5],
  },
  buttonPressed: {
    backgroundColor: colors.brand[700],
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonLabel: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
