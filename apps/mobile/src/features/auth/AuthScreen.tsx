import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  register,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  signIn,
  verifyEmail,
} from '../../api/auth';
import { ApiError } from '../../api/client';
import type { AuthenticatedResponse } from '../../api/types';
import { BrandHeader, Button, Card, Field, Message, Screen } from '../../components/ui';
import { colors, spacing } from '../../theme/tokens';

export type AuthIntent =
  | { kind: 'verify-email'; token: string }
  | { kind: 'reset-password'; token: string }
  | { kind: 'join'; token: string };

type Mode = 'sign-in' | 'register' | 'verify' | 'forgot' | 'reset';

type Props = {
  intent?: AuthIntent;
  onAuthenticated: (response: AuthenticatedResponse) => Promise<void>;
};

export function AuthScreen({ intent, onAuthenticated }: Props) {
  const initialMode: Mode =
    intent?.kind === 'verify-email' ? 'verify' : intent?.kind === 'reset-password' ? 'reset' : 'sign-in';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [token, setToken] = useState(intent?.kind === 'join' ? '' : intent?.token ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function submit(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
    } catch (submissionError) {
      setError(
        submissionError instanceof ApiError || submissionError instanceof Error
          ? submissionError.message
          : 'Domi could not complete that request.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'register') {
    return (
      <Screen>
        <BrandHeader title="Create your Domi account" subtitle="Start one shared home for everyone." />
        <Card>
          <Field
            autoCapitalize="words"
            autoComplete="name"
            label="Your name"
            onChangeText={setDisplayName}
            value={displayName}
          />
          <Field
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            value={email}
          />
          <Field
            autoCapitalize="none"
            autoComplete="new-password"
            helper="Use at least 12 characters."
            label="Password"
            onChangeText={setPassword}
            secureTextEntry
            value={password}
          />
          <Field
            autoCapitalize="none"
            autoComplete="new-password"
            label="Confirm password"
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            value={passwordConfirmation}
          />
          {error ? <Message type="error">{error}</Message> : null}
          <Button
            label="Create account"
            loading={busy}
            onPress={() =>
              void submit(async () => {
                await register({ email, displayName, password, passwordConfirmation });
                setMode('verify');
                setNotice('Check your email for a verification link, or paste the token below.');
              })
            }
          />
          <Button label="I already have an account" onPress={() => setMode('sign-in')} variant="text" />
        </Card>
      </Screen>
    );
  }

  if (mode === 'verify') {
    return (
      <Screen>
        <BrandHeader title="Verify your email" subtitle="Verification keeps household invitations private." />
        <Card>
          {notice ? <Message type="success">{notice}</Message> : null}
          <Field
            autoCapitalize="none"
            label="Verification token"
            onChangeText={setToken}
            value={token}
          />
          {error ? <Message type="error">{error}</Message> : null}
          <Button
            disabled={!token.trim()}
            label="Verify and continue"
            loading={busy}
            onPress={() =>
              void submit(async () => {
                await onAuthenticated(await verifyEmail(token.trim()));
              })
            }
          />
          <Button
            disabled={!email.trim()}
            label="Send a new link"
            onPress={() =>
              void submit(async () => {
                await resendVerification(email.trim());
                setNotice('If that unverified account exists, a new link is on its way.');
              })
            }
            variant="secondary"
          />
          <Button label="Back to sign in" onPress={() => setMode('sign-in')} variant="text" />
        </Card>
      </Screen>
    );
  }

  if (mode === 'forgot') {
    return (
      <Screen>
        <BrandHeader title="Reset your password" subtitle="We’ll email a single-use reset link." />
        <Card>
          <Field
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            value={email}
          />
          {notice ? <Message type="success">{notice}</Message> : null}
          {error ? <Message type="error">{error}</Message> : null}
          <Button
            disabled={!email.trim()}
            label="Send reset link"
            loading={busy}
            onPress={() =>
              void submit(async () => {
                await requestPasswordReset(email.trim());
                setNotice('If that account exists, a reset link is on its way.');
              })
            }
          />
          <Button label="I have a reset token" onPress={() => setMode('reset')} variant="secondary" />
          <Button label="Back to sign in" onPress={() => setMode('sign-in')} variant="text" />
        </Card>
      </Screen>
    );
  }

  if (mode === 'reset') {
    return (
      <Screen>
        <BrandHeader title="Choose a new password" />
        <Card>
          <Field autoCapitalize="none" label="Reset token" onChangeText={setToken} value={token} />
          <Field
            autoComplete="new-password"
            helper="Use at least 12 characters."
            label="New password"
            onChangeText={setPassword}
            secureTextEntry
            value={password}
          />
          <Field
            autoComplete="new-password"
            label="Confirm new password"
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            value={passwordConfirmation}
          />
          {error ? <Message type="error">{error}</Message> : null}
          <Button
            disabled={!token.trim()}
            label="Reset and sign in"
            loading={busy}
            onPress={() =>
              void submit(async () => {
                await onAuthenticated(
                  await resetPassword(token.trim(), password, passwordConfirmation),
                );
              })
            }
          />
          <Button label="Back to sign in" onPress={() => setMode('sign-in')} variant="text" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.brandBlock}>
        <Text accessibilityRole="header" style={styles.brand}>
          Domi
        </Text>
        <Text style={styles.tagline}>Your home, organised.</Text>
      </View>
      <Card>
        <Field
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          value={email}
        />
        <Field
          autoCapitalize="none"
          autoComplete="current-password"
          label="Password"
          onChangeText={setPassword}
          secureTextEntry
          value={password}
        />
        {error ? <Message type="error">{error}</Message> : null}
        <Button
          label="Sign in"
          loading={busy}
          onPress={() =>
            void submit(async () => {
              try {
                await onAuthenticated(await signIn(email.trim(), password));
              } catch (signInError) {
                if (signInError instanceof ApiError && signInError.code === 'account.email_not_verified') {
                  setMode('verify');
                }
                throw signInError;
              }
            })
          }
        />
        <Button label="Create an account" onPress={() => setMode('register')} variant="secondary" />
        <Button label="Forgot password?" onPress={() => setMode('forgot')} variant="text" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandBlock: { gap: spacing[1], marginTop: spacing[10] },
  brand: { color: colors.text.primary, fontSize: 32, fontWeight: '700', lineHeight: 38 },
  tagline: { color: colors.text.secondary, fontSize: 16, lineHeight: 24 },
});
