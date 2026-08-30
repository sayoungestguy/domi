import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

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
import { confirmAction } from '../../components/confirmAction';
import { InventoryScreen } from '../inventory/InventoryScreen';
import { NotificationsScreen } from '../notifications/NotificationsScreen';
import { ShoppingScreen } from '../shopping/ShoppingScreen';
import { useHouseholdRealtime } from '../../realtime/useHouseholdRealtime';
import { colors, radii, spacing } from '../../theme/tokens';
import { required, requiredMaxLength } from '../../validation/rules';
import { useFormValidation } from '../../validation/useFormValidation';

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
  const [section, setSection] = useState<
    'inventory' | 'shopping' | 'notifications' | 'settings'
  >('inventory');
  const processedJoinToken = useRef<string | undefined>(undefined);
  const validation = useFormValidation();

  const householdNameError = requiredMaxLength(householdName, 'Household name', 100);
  const joinTokenError = required(joinToken, 'Invitation token');

  const selected = useMemo(
    () => households.find((household) => household.id === selectedId),
    [households, selectedId],
  );
  const realtime = useHouseholdRealtime(selectedId);

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
    return response.households;
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
    if (!selectedId || realtime.revision === 0) return;
    const timer = setTimeout(() => {
      void loadHouseholds()
        .then((refreshed) => {
          const current = refreshed.find((household) => household.id === selectedId);
          return current ? loadHouseholdDetails(current) : undefined;
        })
        .catch(handleError);
    }, 0);
    return () => clearTimeout(timer);
  }, [handleError, loadHouseholdDetails, loadHouseholds, realtime.revision, selectedId]);

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

  return (
    <Screen>
      <BrandHeader title={`Hello, ${user.displayName}`} subtitle="Choose a home or create a new one." />
      {notice ? <Message type="success">{notice}</Message> : null}
      {error ? <Message type="error">{error}</Message> : null}
      {realtime.status === 'disconnected' ? (
        <Message type="error">
          Live updates are unavailable. Domi will refresh this home when the connection returns.
        </Message>
      ) : null}
      {realtime.status === 'gap' ? (
        <Message type="error">Domi detected missed updates and refreshed this home.</Message>
      ) : null}

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
        <View accessibilityRole="tablist" style={styles.navigation}>
          <NavigationTab
            active={section === 'inventory'}
            label="Inventory"
            onPress={() => setSection('inventory')}
          />
          <NavigationTab
            active={section === 'shopping'}
            label="Shopping"
            onPress={() => setSection('shopping')}
          />
          <NavigationTab
            active={section === 'notifications'}
            label="Alerts"
            onPress={() => setSection('notifications')}
          />
          <NavigationTab
            active={section === 'settings'}
            label="Settings"
            onPress={() => setSection('settings')}
          />
        </View>
      ) : null}

      {selected && section === 'inventory' ? (
        <InventoryScreen
          household={selected}
          key={`inventory-${selected.id}`}
          refreshSignal={realtime.revision}
        />
      ) : null}
      {selected && section === 'shopping' ? (
        <ShoppingScreen
          household={selected}
          key={`shopping-${selected.id}`}
          refreshSignal={realtime.revision}
        />
      ) : null}
      {selected && section === 'notifications' ? (
        <NotificationsScreen
          household={selected}
          key={`notifications-${selected.id}`}
          refreshSignal={realtime.revision}
        />
      ) : null}

      {selected && section === 'settings' ? (
        <>
          <Card>
            <Text style={sharedStyles.sectionTitle}>Household details</Text>
            <Field
              error={validation.error('householdName', householdNameError)}
              label="Household name"
              onChangeText={validation.bind('householdName', setHouseholdName)}
              value={householdName}
            />
            <Text style={sharedStyles.secondary}>Timezone: {selected.timezone}</Text>
            {selected.role === 'owner' ? (
              <Button
                disabled={Boolean(householdNameError) || householdName.trim() === selected.name}
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
                          if (!(await confirmAction({ title: 'Transfer ownership?', message: `${membership.user.displayName} will become the owner.`, confirmLabel: 'Continue', destructive: true }))) {
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
                          if (!(await confirmAction({ title: 'Remove member?', message: `${membership.user.displayName} will lose access to this home.`, confirmLabel: 'Continue', destructive: true }))) {
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
                  if (!(await confirmAction({ title: 'Leave household?', message: 'You will need another invitation to rejoin.', confirmLabel: 'Continue', destructive: true }))) {
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
      ) : !selected ? (
        <Card>
          <Text style={sharedStyles.sectionTitle}>Create your first home</Text>
          <Field
            error={validation.error('householdName', householdNameError)}
            label="Household name"
            onChangeText={validation.bind('householdName', setHouseholdName)}
            placeholder="Tan Household"
            value={householdName}
          />
          <Button
            disabled={Boolean(householdNameError)}
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
      ) : null}

      <Card>
        <Text style={sharedStyles.sectionTitle}>Join with an invitation</Text>
        <Field
          autoCapitalize="none"
          error={validation.error('joinToken', joinTokenError)}
          label="Invitation token"
          onChangeText={validation.bind('joinToken', setJoinToken)}
          value={joinToken}
        />
        <Button
          disabled={Boolean(joinTokenError)}
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

function NavigationTab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.navigationTab, active && styles.navigationTabActive]}
    >
      <Text style={[styles.navigationLabel, active && styles.navigationLabelActive]}>{label}</Text>
    </Pressable>
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
  navigation: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing[1],
  },
  navigationTab: {
    alignItems: 'center',
    borderRadius: radii.control,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing[2],
  },
  navigationTabActive: { backgroundColor: colors.brand[100] },
  navigationLabel: { color: colors.text.secondary, fontSize: 14, fontWeight: '600' },
  navigationLabelActive: { color: colors.brand[700] },
  member: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing[3], paddingTop: spacing[4] },
  memberIdentity: { gap: spacing[1] },
  compactActions: { gap: spacing[2] },
  inviteSecret: { gap: spacing[3] },
  invitationRow: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing[2], paddingTop: spacing[3] },
});
