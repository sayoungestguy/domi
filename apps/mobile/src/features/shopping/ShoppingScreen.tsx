import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { ApiError } from '../../api/client';
import { listInventoryItems } from '../../api/inventory';
import {
  createShoppingEntry,
  getShoppingList,
  removeShoppingEntry,
  setShoppingEntryPurchased,
  updateShoppingEntry,
  updateShoppingPreference,
  type ShoppingEntryInput,
} from '../../api/shopping';
import type { Household, InventoryItem, ShoppingEntry, ShoppingList } from '../../api/types';
import { Button, Card, Field, Message, sharedStyles } from '../../components/ui';
import { colors, radii, spacing } from '../../theme/tokens';
import { maxLength, quantity as validateQuantity, requiredMaxLength } from '../../validation/rules';
import { useFormValidation } from '../../validation/useFormValidation';

type Props = { household: Household };

export function ShoppingScreen({ household }: Props) {
  const [list, setList] = useState<ShoppingList>();
  const [outItems, setOutItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ShoppingEntry>();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const validation = useFormValidation();

  const nameError = requiredMaxLength(name, 'Item name', 120);
  const quantityError = validateQuantity(quantity);
  const noteError = maxLength(note, 'Note', 1_000);

  const refresh = useCallback(async () => {
    const [listResponse, inventoryResponse] = await Promise.all([
      getShoppingList(household.id),
      listInventoryItems(household.id, { status: 'out' }),
    ]);
    setList(listResponse.shoppingList);
    setOutItems(inventoryResponse.items);
  }, [household.id]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getShoppingList(household.id),
      listInventoryItems(household.id, { status: 'out' }),
    ])
      .then(([listResponse, inventoryResponse]) => {
        if (!active) return;
        setList(listResponse.shoppingList);
        setOutItems(inventoryResponse.items);
      })
      .catch((loadError) => {
        if (active) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [household.id]);

  const remaining = useMemo(
    () => list?.entries.filter((entry) => !entry.purchased) ?? [],
    [list],
  );
  const purchased = useMemo(
    () => list?.entries.filter((entry) => entry.purchased) ?? [],
    [list],
  );
  const unlinkedOutItems = useMemo(() => {
    const linked = new Set(list?.entries.map((entry) => entry.inventoryItemId).filter(Boolean));
    return outItems.filter((item) => !linked.has(item.id));
  }, [list, outItems]);

  async function runAction(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
    } catch (actionError) {
      setError(errorMessage(actionError));
      if (actionError instanceof ApiError && actionError.code === 'shopping.version_conflict') {
        try {
          await refresh();
        } catch {
          // Keep the original conflict explanation visible.
        }
      }
    } finally {
      setBusy(undefined);
    }
  }

  function openForm(entry?: ShoppingEntry) {
    validation.reset();
    setEditing(entry);
    setName(entry?.name ?? '');
    setQuantity(entry?.quantity?.toString() ?? '');
    setNote(entry?.note ?? '');
    setShowForm(true);
    setError(undefined);
    setNotice(undefined);
  }

  function closeForm() {
    validation.reset();
    setShowForm(false);
    setEditing(undefined);
  }

  async function saveEntry() {
    const input: ShoppingEntryInput = {
      name: name.trim(),
      quantity: quantity.trim() ? Number(quantity) : null,
      note: note.trim() || null,
    };
    const response = editing
      ? await updateShoppingEntry(household.id, editing, input)
      : await createShoppingEntry(household.id, input);
    const wasEditing = Boolean(editing);
    closeForm();
    await refresh();
    setNotice(`${response.entry.name} was ${wasEditing ? 'updated' : 'added to shopping'}.`);
  }

  async function confirmRemove(entry: ShoppingEntry) {
    return new Promise<boolean>((resolve) => {
      Alert.alert('Remove from shopping?', `${entry.name} will leave this list.`, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Remove', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  }

  if (loading && !list) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.loading}>
        <ActivityIndicator color={colors.brand[600]} />
        <Text style={sharedStyles.secondary}>Loading shopping list…</Text>
      </View>
    );
  }

  if (!list) {
    return (
      <Card>
        <Text style={sharedStyles.sectionTitle}>Shopping is unavailable</Text>
        {error ? <Message type="error">{error}</Message> : null}
        <Button label="Try again" onPress={() => void runAction('retry', refresh)} />
      </Card>
    );
  }

  return (
    <View style={sharedStyles.stack}>
      {notice ? <Message type="success">{notice}</Message> : null}
      {error ? <Message type="error">{error}</Message> : null}

      <Card>
        <View style={styles.modeHeader}>
          <View style={styles.modeIdentity}>
            <Text style={sharedStyles.sectionTitle}>Shopping mode</Text>
            <Text accessibilityLiveRegion="polite" style={styles.remainingCount}>
              {list.remainingCount} {list.remainingCount === 1 ? 'item' : 'items'} left
            </Text>
          </View>
          <Button label="Add item" onPress={() => openForm()} />
        </View>
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceText}>
            <Text style={sharedStyles.body}>Automatically add OUT items</Text>
            <Text style={sharedStyles.secondary}>Keep inventory and shopping connected.</Text>
          </View>
          <Switch
            accessibilityLabel="Automatically add OUT inventory items to shopping"
            accessibilityRole="switch"
            disabled={busy === 'preference'}
            onValueChange={(enabled) =>
              void runAction('preference', async () => {
                await updateShoppingPreference(household.id, enabled);
                await refresh();
                setNotice(`Automatic addition is ${enabled ? 'on' : 'off'}.`);
              })
            }
            trackColor={{ false: colors.border, true: colors.brand[600] }}
            value={list.autoAddOutItems}
          />
        </View>
      </Card>

      {showForm ? (
        <Card>
          <Text style={sharedStyles.sectionTitle}>{editing ? `Edit ${editing.name}` : 'Add to shopping'}</Text>
          <Field
            error={validation.error('name', nameError)}
            label="Item name"
            onChangeText={validation.bind('name', setName)}
            value={name}
          />
          <Field
            error={validation.error('quantity', quantityError)}
            keyboardType="decimal-pad"
            label="Quantity (optional)"
            onChangeText={validation.bind('quantity', setQuantity)}
            value={quantity}
          />
          <Field
            error={validation.error('note', noteError)}
            label="Note (optional)"
            multiline
            onChangeText={validation.bind('note', setNote)}
            value={note}
          />
          <Button
            disabled={Boolean(nameError || quantityError || noteError)}
            label={editing ? 'Save entry' : 'Add to shopping'}
            loading={busy === 'save'}
            onPress={() => void runAction('save', saveEntry)}
          />
          <Button label="Cancel" onPress={closeForm} variant="text" />
        </Card>
      ) : null}

      {unlinkedOutItems.length > 0 ? (
        <Card>
          <Text style={sharedStyles.sectionTitle}>Out at home</Text>
          <Text style={sharedStyles.secondary}>Add an OUT inventory item without typing it again.</Text>
          {unlinkedOutItems.map((item) => (
            <View key={item.id} style={styles.quickAddRow}>
              <Text style={styles.entryName}>{item.name}</Text>
              <Button
                label="Add"
                loading={busy === `link-${item.id}`}
                onPress={() =>
                  void runAction(`link-${item.id}`, async () => {
                    await createShoppingEntry(household.id, { inventoryItemId: item.id });
                    await refresh();
                    setNotice(`${item.name} was added to shopping.`);
                  })
                }
                variant="secondary"
              />
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text style={sharedStyles.sectionTitle}>Still needed</Text>
        {remaining.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={sharedStyles.body}>Nothing left to pick up.</Text>
            <Text style={sharedStyles.secondary}>Add an item when your home needs something.</Text>
            <Button label="Add an item" onPress={() => openForm()} variant="secondary" />
          </View>
        ) : (
          remaining.map((entry) => (
            <EntryRow
              busy={busy === `purchase-${entry.id}`}
              entry={entry}
              key={entry.id}
              onEdit={() => openForm(entry)}
              onRemove={() =>
                void runAction(`remove-${entry.id}`, async () => {
                  if (!(await confirmRemove(entry))) return;
                  await removeShoppingEntry(household.id, entry);
                  await refresh();
                  setNotice(`${entry.name} was removed.`);
                })
              }
              onSetPurchased={(purchasedValue) =>
                void runAction(`purchase-${entry.id}`, async () => {
                  await setShoppingEntryPurchased(household.id, entry, purchasedValue);
                  await refresh();
                })
              }
            />
          ))
        )}
      </Card>

      {purchased.length > 0 ? (
        <Card>
          <Text style={sharedStyles.sectionTitle}>Purchased ({purchased.length})</Text>
          {purchased.map((entry) => (
            <EntryRow
              busy={busy === `purchase-${entry.id}`}
              entry={entry}
              key={entry.id}
              onEdit={() => openForm(entry)}
              onRemove={() =>
                void runAction(`remove-${entry.id}`, async () => {
                  if (!(await confirmRemove(entry))) return;
                  await removeShoppingEntry(household.id, entry);
                  await refresh();
                  setNotice(`${entry.name} was removed.`);
                })
              }
              onSetPurchased={(purchasedValue) =>
                void runAction(`purchase-${entry.id}`, async () => {
                  await setShoppingEntryPurchased(household.id, entry, purchasedValue);
                  await refresh();
                })
              }
            />
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function EntryRow({
  busy,
  entry,
  onEdit,
  onRemove,
  onSetPurchased,
}: {
  busy: boolean;
  entry: ShoppingEntry;
  onEdit: () => void;
  onRemove: () => void;
  onSetPurchased: (purchased: boolean) => void;
}) {
  const detail = [entry.quantity === null ? undefined : `Qty ${entry.quantity}`, entry.note]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={styles.entryRow}>
      <Pressable
        accessibilityHint={entry.purchased ? 'Returns this item to the remaining list' : 'Moves this item to Purchased'}
        accessibilityLabel={`${entry.name}, ${entry.purchased ? 'purchased' : 'not purchased'}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: entry.purchased, busy }}
        disabled={busy}
        onPress={() => onSetPurchased(!entry.purchased)}
        style={({ pressed }) => [styles.checkTarget, pressed && styles.pressed]}
      >
        <View style={[styles.checkbox, entry.purchased && styles.checkboxChecked]}>
          <Text style={entry.purchased ? styles.checkmark : styles.emptyCheck}>
            {entry.purchased ? '✓' : ''}
          </Text>
        </View>
        <View style={styles.entryIdentity}>
          <Text style={[styles.entryName, entry.purchased && styles.entryPurchased]}>{entry.name}</Text>
          {detail ? <Text style={sharedStyles.secondary}>{detail}</Text> : null}
          <Text style={sharedStyles.secondary}>Updated by {entry.updatedBy.displayName}</Text>
        </View>
      </Pressable>
      <View style={sharedStyles.row}>
        <Button label="Edit" onPress={onEdit} variant="text" />
        <Button label="Remove" onPress={onRemove} variant="danger" />
      </View>
    </View>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403) {
    return 'You do not have permission to use this household shopping list.';
  }
  return error instanceof Error ? error.message : 'Domi could not load shopping.';
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: spacing[3], padding: spacing[8] },
  modeHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing[4], justifyContent: 'space-between' },
  modeIdentity: { flex: 1, gap: spacing[1] },
  remainingCount: { color: colors.brand[700], fontSize: 22, fontWeight: '700', lineHeight: 28 },
  preferenceRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[4] },
  preferenceText: { flex: 1, gap: spacing[1] },
  quickAddRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[3], justifyContent: 'space-between' },
  emptyState: { gap: spacing[3] },
  entryRow: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing[2], paddingTop: spacing[3] },
  checkTarget: { alignItems: 'center', flexDirection: 'row', gap: spacing[3], minHeight: 64 },
  pressed: { opacity: 0.75 },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.brand[600],
    borderRadius: radii.control,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  checkboxChecked: { backgroundColor: colors.brand[600] },
  checkmark: { color: colors.surface, fontSize: 22, fontWeight: '700' },
  emptyCheck: { color: 'transparent' },
  entryIdentity: { flex: 1, gap: spacing[1] },
  entryName: { color: colors.text.primary, fontSize: 18, fontWeight: '600', lineHeight: 24 },
  entryPurchased: { color: colors.text.secondary, textDecorationLine: 'line-through' },
});
