import { useState } from 'react';
import { Share, Text } from 'react-native';

import { ApiError } from '../../api/client';
import {
  deleteAccount,
  deleteHousehold,
  getAccountExport,
  getHouseholdExport,
  type PrivacyExport,
} from '../../api/privacy';
import type { Household } from '../../api/types';
import { confirmAction } from '../../components/confirmAction';
import { Button, Card, Field, Message, sharedStyles } from '../../components/ui';
import { required } from '../../validation/rules';
import { useFormValidation } from '../../validation/useFormValidation';

type Props = {
  household?: Household;
  onAccountDeleted: () => Promise<void>;
  onHouseholdDeleted: () => Promise<void>;
};

export function PrivacyControls({ household, onAccountDeleted, onHouseholdDeleted }: Props) {
  const [householdConfirmation, setHouseholdConfirmation] = useState('');
  const [accountConfirmation, setAccountConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const validation = useFormValidation();
  const passwordError = required(currentPassword, 'Current password');
  const accountConfirmationError =
    accountConfirmation === 'DELETE MY ACCOUNT'
      ? undefined
      : 'Enter DELETE MY ACCOUNT exactly.';
  const householdConfirmationError =
    !household || householdConfirmation === household.name
      ? undefined
      : `Enter ${household.name} exactly.`;

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
    } catch (actionError) {
      setError(messageFor(actionError));
    } finally {
      setBusy(undefined);
    }
  }

  async function shareExport(title: string, payload: PrivacyExport) {
    await Share.share({ title, message: JSON.stringify(payload, null, 2) });
  }

  return (
    <>
      {notice ? <Message type="success">{notice}</Message> : null}
      {error ? <Message type="error">{error}</Message> : null}

      <Card>
        <Text style={sharedStyles.sectionTitle}>Your data</Text>
        <Text style={sharedStyles.secondary}>
          Export a portable JSON copy. Passwords, sessions, and invitation secrets are never included.
        </Text>
        <Button
          label="Export my account data"
          loading={busy === 'account-export'}
          onPress={() =>
            void run('account-export', async () => {
              const response = await getAccountExport();
              await shareExport('Domi account export', response.export);
              setNotice('Account export is ready.');
            })
          }
          variant="secondary"
        />
        {household?.role === 'owner' ? (
          <Button
            label="Export household data"
            loading={busy === 'household-export'}
            onPress={() =>
              void run('household-export', async () => {
                const response = await getHouseholdExport(household.id);
                await shareExport(`${household.name} export`, response.export);
                setNotice('Household export is ready.');
              })
            }
            variant="secondary"
          />
        ) : null}
      </Card>

      {household?.role === 'owner' ? (
        <Card>
          <Text style={sharedStyles.sectionTitle}>Delete household</Text>
          <Text style={sharedStyles.secondary}>
            Permanently deletes this household and all of its inventory, shopping, activity, and notification data.
          </Text>
          <Field
            autoCapitalize="none"
            error={validation.error('householdConfirmation', householdConfirmationError)}
            label="Type household name to delete"
            onChangeText={validation.bind('householdConfirmation', setHouseholdConfirmation)}
            value={householdConfirmation}
          />
          <Button
            disabled={Boolean(householdConfirmationError)}
            label="Delete household permanently"
            loading={busy === 'delete-household'}
            onPress={() =>
              void run('delete-household', async () => {
                const confirmed = await confirmAction({
                  title: 'Delete household permanently?',
                  message: 'This cannot be undone. Existing database backups may retain older copies.',
                  confirmLabel: 'Delete permanently',
                  destructive: true,
                });
                if (!confirmed) return;
                await deleteHousehold(household.id, householdConfirmation);
                await onHouseholdDeleted();
              })
            }
            variant="danger"
          />
        </Card>
      ) : null}

      <Card>
        <Text style={sharedStyles.sectionTitle}>Delete account</Text>
        <Text style={sharedStyles.secondary}>
          Your credentials and identity are erased. Transfer or delete every household you own first.
        </Text>
        <Field
          error={validation.error('currentPassword', passwordError)}
          label="Current password"
          onChangeText={validation.bind('currentPassword', setCurrentPassword)}
          secureTextEntry
          value={currentPassword}
        />
        <Field
          autoCapitalize="characters"
          error={validation.error('accountConfirmation', accountConfirmationError)}
          label="Type DELETE MY ACCOUNT"
          onChangeText={validation.bind('accountConfirmation', setAccountConfirmation)}
          value={accountConfirmation}
        />
        <Button
          disabled={Boolean(passwordError || accountConfirmationError)}
          label="Delete my account permanently"
          loading={busy === 'delete-account'}
          onPress={() =>
            void run('delete-account', async () => {
              const confirmed = await confirmAction({
                title: 'Delete your account permanently?',
                message: 'Your sign-in credentials and personal identity will be erased.',
                confirmLabel: 'Delete permanently',
                destructive: true,
              });
              if (!confirmed) return;
              await deleteAccount(currentPassword, accountConfirmation);
              await onAccountDeleted();
            })
          }
          variant="danger"
        />
      </Card>
    </>
  );
}

function messageFor(error: unknown) {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Domi could not complete that privacy request.';
}
