import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { colors, radii, spacing } from '../theme/tokens';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function BrandHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  helper?: string;
  error?: string;
};

export function Field({ label, helper, error, accessibilityHint, style, ...props }: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? accessibilityHint}
        aria-invalid={Boolean(error)}
        placeholderTextColor={colors.text.secondary}
        style={[styles.input, error && styles.inputError, style]}
        {...props}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
          {error}
        </Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'text';
};

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonVariantStyles[variant],
        pressed && styles.buttonPressed,
        inactive && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.surface : colors.brand[600]} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === 'primary' ? styles.primaryButtonLabel : styles.secondaryButtonLabel,
            variant === 'danger' && styles.dangerButtonLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Message({ type, children }: { type: 'error' | 'success'; children: ReactNode }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.message, type === 'error' ? styles.errorMessage : styles.successMessage]}
    >
      <Text style={type === 'error' ? styles.errorText : styles.successText}>{children}</Text>
    </View>
  );
}

export function Card({ children, testID }: { children: ReactNode; testID?: string }) {
  return <View style={styles.card} testID={testID}>{children}</View>;
}

export const sharedStyles = StyleSheet.create({
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    color: colors.text.primary,
    fontSize: 16,
    lineHeight: 24,
  },
  secondary: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  stack: {
    gap: spacing[4],
  },
});

const buttonVariantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  secondary: { backgroundColor: colors.surface, borderColor: colors.brand[600] },
  danger: { backgroundColor: colors.surface, borderColor: colors.status.out },
  text: { backgroundColor: 'transparent', borderColor: 'transparent' },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    backgroundColor: colors.canvas,
    flexGrow: 1,
    gap: spacing[6],
    padding: spacing[6],
    paddingBottom: spacing[12],
  },
  header: { gap: spacing[1] },
  title: {
    color: colors.text.primary,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  subtitle: { color: colors.text.secondary, fontSize: 16, lineHeight: 24 },
  fieldGroup: { gap: spacing[2] },
  label: { color: colors.text.primary, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.text.primary,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  helper: { color: colors.text.secondary, fontSize: 13, lineHeight: 18 },
  inputError: { borderColor: colors.status.out, borderWidth: 2 },
  fieldError: { color: colors.status.out, fontSize: 13, lineHeight: 18 },
  button: {
    alignItems: 'center',
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing[5],
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  primaryButtonLabel: { color: colors.surface },
  secondaryButtonLabel: { color: colors.brand[700] },
  dangerButtonLabel: { color: colors.status.out },
  message: { borderRadius: radii.control, borderWidth: 1, padding: spacing[3] },
  errorMessage: { backgroundColor: colors.status.outSurface, borderColor: colors.status.out },
  successMessage: { backgroundColor: colors.brand[100], borderColor: colors.status.ok },
  errorText: { color: colors.status.out, fontSize: 14, lineHeight: 20 },
  successText: { color: colors.brand[700], fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing[4],
    padding: spacing[5],
  },
});
