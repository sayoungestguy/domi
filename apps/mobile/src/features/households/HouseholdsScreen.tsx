import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import {
  createHousehold,
  createInvitation,
  joinHousehold,
  leaveHousehold,
  listHouseholds,
  listInvitations,
  listMemberships,
  removeMembership,
  revokeInvitation,
  transferOwnership,
  updateHousehold,
} from '../../api/households';
import type { Household, Invitation, Membership, User } from '../../api/types';
import { BrandHeader, Button, Card, Field, Message, Screen, sharedStyles } from '../../components/ui';
import { colors, radii, spacing } from '../../theme/tokens';

type Props = {
  user: User;
  initialJoinToken?: string;
  onJoinIntentConsumed: () => void;
  onSignOut: () => Promise<void>;
};

export function HouseholdsScreen({
  user,
  initialJoinToken,
  onJoinIntentConsumed,
  onSignOut,
}: Props) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [householdName, setHouseholdName] = useState('');
  const [joinToken, setJoinToken] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const processedJoinToken = useRef<string | undefined>(undefined);

  const selected = useMemo(
    () => households.find((household) => household.id === selectedId),
    [households, selectedId],
  );

  const handleError = useCallback((actionError: unknown) => {
    setError(
      actionError instanceof ApiError || actionError instanceof Error
        ? actionError.message
        : 'Domi could not complete that request.',
    );
  }, []);

  const loadHouseholds = useCallback(async () => {
    const response = await listHouseholds();
    setHouseholds(response.households);
    setSelectedId((current) => {
      if (current && response.households.some((household) => household.id === current)) {
        return current;
      }
      return response.households[0]?.id;
    });
  }, []);

  const loadHouseholdDetails = useCallback(async (household: Household) => {
    const membershipResponse = await listMemberships(household.id);
    setMemberships(membershipResponse.memberships);
    if (household.role === 'owner') {
      const invitationResponse = await listInvitations(household.id);
      setInvitations(invitationResponse.invitations);
    } else {
      setInvitations([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void listHouseholds()
      .then((response) => {
        if (!active) return;
        setHouseholds(response.households);
        setSelectedId(response.households[0]?.id);
        setHouseholdName(response.households[0]?.name ?? '');
      })
      .catch(handleError);
    return () => {
      active = false;
    };
  }, [handleError]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    const membershipsRequest = listMemberships(selected.id);
    const invitationsRequest =
      selected.role === 'owner' ? listInvitations(selected.id) : Promise.resolve({ invitations: [] });
    void Promise.all([membershipsRequest, invitationsRequest])
      .then(([membershipResponse, invitationResponse]) => {
        if (!active) return;
        setHouseholdName(selected.name);
        setMemberships(membershipResponse.memberships);
        setInvitations(invitationResponse.invitations);
      })
      .catch(handleError);
    return () => {
      active = false;
    };
  }, [handleError, selected]);

  useEffect(() => {
    if (!initialJoinToken || processedJoinToken.current === initialJoinToken) {
      return;
    }
    processedJoinToken.current = initialJoinToken;
    setBusy('join');
    void joinHousehold(initialJoinToken)
      .then(async ({ household }) => {
        setNotice(`You joined ${household.name}.`);
        await loadHouseholds();
        setSelectedId(household.id);
      })
      .catch(handleError)
      .finally(() => {
        setBusy(undefined);
        onJoinIntentConsumed();
      });
  }, [handleError, initialJoinToken, loadHouseholds, onJoinIntentConsumed]);

  async function runAction(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
    } catch (actionError) {
      handleError(actionError);
    } finally {
      setBusy(undefined);
    }
  }

  async function confirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  }

  return (
    <Screen>
      <BrandHeader title={`Hello, ${user.displayName}`} subtitle="Choose a home or create a new one." />
      {notice ? <Message type="success">{notice}</Message> : null}
      {error ? <Message type="error">{error}</Message> : null}

      {households.length > 0 ? (
        <View style={styles.householdPicker}>
          {households.map((household) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: household.id === selectedId }}
              key={household.id}
              onPress={() => {
                setSelectedId(household.id);
                setHouseholdName(household.name);
              }}
              style={[
                styles.householdChoice,
                household.id === selectedId && styles.householdChoiceSelected,
              ]}
            >
              <Text style={styles.householdChoiceName}>{household.name}</Text>
              <Text style={sharedStyles.secondary}>{household.role}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {selected ? (
        <>
          <Card>
            <Text style={sharedStyles.sectionTitle}>Household details</Text>
            <Field label="Household name" onChangeText={setHouseholdName} value={householdName} />
            <Text style={sharedStyles.secondary}>Timezone: {selected.timezone}</Text>
            {selected.role === 'owner' ? (
              <Button
                disabled={!householdName.trim() || householdName.trim() === selected.name}
                label="Save household"
                loading={busy === 'rename'}
                onPress={() =>
                  void runAction('rename', async () => {
                    const response = await updateHousehold(selected.id, {
                      name: householdName.trim(),
                    });
                    setHouseholds((current) =>
                      current.map((household) =>
                        household.id === response.household.id ? response.household : household,
                      ),
                    );
                    setNotice('Household details saved.');
                  })
                }
              />
            ) : null}
          </Card>

          <Card>
            <Text style={sharedStyles.sectionTitle}>Members</Text>
            {memberships.map((membership) => (
              <View key={membership.id} style={styles.member}>
                <View style={styles.memberIdentity}>
                  <Text style={sharedStyles.body}>{membership.user.displayName}</Text>
                  <Text style={sharedStyles.secondary}>
                    {membership.user.email} · {membership.role}
                  </Text>
                </View>
                {selected.role === 'owner' && membership.user.id !== user.id ? (
                  <View style={styles.compactActions}>
                    <Button
                      label="Transfer ownership"
                      loading={busy === `transfer-${membership.id}`}
                      onPress={() =>
                        void runAction(`transfer-${membership.id}`, async () => {
                          if (!(await confirm('Transfer ownership?', `${membership.user.displayName} will become the owner.`))) {
                            return;
                          }
                          await transferOwnership(selected.id, membership.id);
                          await loadHouseholds();
                          setNotice('Ownership transferred.');
                        })
                      }
                      variant="secondary"
                    />
                    <Button
                      label="Remove"
                      loading={busy === `remove-${membership.id}`}
                      onPress={() =>
                        void runAction(`remove-${membership.id}`, async () => {
                          if (!(await confirm('Remove member?', `${membership.user.displayName} will lose access to this home.`))) {
                            return;
                          }
                          await removeMembership(selected.id, membership.id);
                          await loadHouseholdDetails(selected);
                          setNotice('Member removed.');
                        })
                      }
                      variant="danger"
                    />
                  </View>
                ) : null}
              </View>
            ))}
          </Card>

          {selected.role === 'owner' ? (
            <Card>
              <Text style={sharedStyles.sectionTitle}>Invite someone</Text>
              <Text style={sharedStyles.secondary}>
                Invitations expire after seven days and can be used once.
              </Text>
              <Button
                label="Create invitation"
                loading={busy === 'invite'}
                onPress={() =>
                  void runAction('invite', async () => {
                    const invitation = await createInvitation(selected.id);
                    setInviteUrl(invitation.inviteUrl);
                    await loadHouseholdDetails(selected);
                  })
                }
              />
              {inviteUrl ? (
                <View style={styles.inviteSecret}>
                  <Text selectable style={sharedStyles.secondary}>
                    {inviteUrl}
                  </Text>
                  <Button
                    label="Share invitation"
                    onPress={() => void Share.share({ message: inviteUrl })}
                    variant="secondary"
                  />
                </View>
              ) : null}
              {invitations.filter((invitation) => !invitation.revokedAt && !invitation.acceptedAt).map((invitation) => (
                <View key={invitation.id} style={styles.invitationRow}>
                  <Text style={sharedStyles.secondary}>
                    Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                  </Text>
                  <Button
                    label="Revoke"
                    loading={busy === `revoke-${invitation.id}`}
                    onPress={() =>
                      void runAction(`revoke-${invitation.id}`, async () => {
                        await revokeInvitation(selected.id, invitation.id);
                        await loadHouseholdDetails(selected);
                        setNotice('Invitation revoked.');
                      })
                    }
                    variant="danger"
                  />
                </View>
              ))}
            </Card>
          ) : (
            <Button
              label="Leave household"
              loading={busy === 'leave'}
              onPress={() =>
                void runAction('leave', async () => {
                  if (!(await confirm('Leave household?', 'You will need another invitation to rejoin.'))) {
                    return;
                  }
                  await leaveHousehold(selected.id);
                  await loadHouseholds();
                  setNotice('You left the household.');
                })
              }
              variant="danger"
            />
          )}
        </>
      ) : (
        <Card>
          <Text style={sharedStyles.sectionTitle}>Create your first home</Text>
          <Field
            label="Household name"
            onChangeText={setHouseholdName}
            placeholder="Tan Household"
            value={householdName}
          />
          <Button
            disabled={!householdName.trim()}
            label="Create home"
            loading={busy === 'create'}
            onPress={() =>
              void runAction('create', async () => {
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
                const response = await createHousehold(householdName.trim(), timezone);
                await loadHouseholds();
                setSelectedId(response.household.id);
                setNotice(`${response.household.name} is ready.`);
              })
            }
          />
        </Card>
      )}

      <Card>
        <Text style={sharedStyles.sectionTitle}>Join with an invitation</Text>
        <Field
          autoCapitalize="none"
          label="Invitation token"
          onChangeText={setJoinToken}
          value={joinToken}
        />
        <Button
          disabled={!joinToken.trim()}
          label="Join household"
          loading={busy === 'join-manual'}
          onPress={() =>
            void runAction('join-manual', async () => {
              const response = await joinHousehold(joinToken.trim());
              setJoinToken('');
              await loadHouseholds();
              setSelectedId(response.household.id);
              setNotice(`You joined ${response.household.name}.`);
            })
          }
          variant="secondary"
        />
      </Card>

      <Button label="Sign out" onPress={() => void onSignOut()} variant="text" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  householdPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  householdChoice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing[1],
    minHeight: 56,
    minWidth: 120,
    padding: spacing[3],
  },
  householdChoiceSelected: { backgroundColor: colors.brand[100], borderColor: colors.brand[600] },
  householdChoiceName: { color: colors.text.primary, fontSize: 16, fontWeight: '600' },
  member: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing[3], paddingTop: spacing[4] },
  memberIdentity: { gap: spacing[1] },
  compactActions: { gap: spacing[2] },
  inviteSecret: { gap: spacing[3] },
  invitationRow: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing[2], paddingTop: spacing[3] },
});
