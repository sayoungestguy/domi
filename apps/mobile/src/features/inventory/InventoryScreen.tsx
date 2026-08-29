import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  changeInventoryStatus,
  createCategory,
  createInventoryItem,
  getInventoryDashboard,
  listCategories,
  listInventoryItems,
  setInventoryArchived,
  updateInventoryItem,
  type InventoryItemInput,
} from '../../api/inventory';
import { ApiError } from '../../api/client';
import { createShoppingEntry } from '../../api/shopping';
import type {
  Category,
  Household,
  InventoryDashboard,
  InventoryItem,
  InventoryStatus,
} from '../../api/types';
import { Button, Card, Field, Message, sharedStyles } from '../../components/ui';
import { confirmAction } from '../../components/confirmAction';
import {
  loadInventorySnapshot,
  saveInventorySnapshot,
} from '../../storage/inventoryCache';
import { colors, radii, spacing } from '../../theme/tokens';
import { maxLength, quantity as validateQuantity, requiredMaxLength } from '../../validation/rules';
import { useFormValidation } from '../../validation/useFormValidation';

const EMPTY_DASHBOARD: InventoryDashboard = {
  summary: { total: 0, ok: 0, low: 0, out: 0, needsAttention: 0, updatedAt: null },
  recentActivity: [],
};

const STATUSES: InventoryStatus[] = ['ok', 'low', 'out'];

type Props = { household: Household; refreshSignal?: number };

export function InventoryScreen({ household, refreshSignal = 0 }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dashboard, setDashboard] = useState<InventoryDashboard>(EMPTY_DASHBOARD);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | undefined>();
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>();
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem>();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<string>();
  const [newCategory, setNewCategory] = useState('');
  const filterValidation = useFormValidation();
  const formValidation = useFormValidation();

  const queryError = maxLength(query, 'Search', 120);
  const nameError = requiredMaxLength(name, 'Item name', 120);
  const quantityError = validateQuantity(quantity);
  const unitError = maxLength(unit, 'Unit', 40);
  const notesError = maxLength(notes, 'Notes', 2_000);
  const newCategoryError = requiredMaxLength(newCategory, 'Category name', 80);

  const refresh = useCallback(async () => {
    if (queryError) return;

    const [itemsResponse, categoriesResponse, dashboardResponse] = await Promise.all([
      listInventoryItems(household.id, {
        query: query.trim() || undefined,
        status: statusFilter,
        archived: showArchived,
      }),
      listCategories(household.id),
      getInventoryDashboard(household.id),
    ]);
    setItems(itemsResponse.items);
    setCategories(categoriesResponse.categories);
    setDashboard(dashboardResponse);
    setOffline(false);
    if (!query.trim() && !statusFilter && !showArchived) {
      void saveInventorySnapshot({
        householdId: household.id,
        items: itemsResponse.items,
        categories: categoriesResponse.categories,
        dashboard: dashboardResponse,
        savedAt: new Date().toISOString(),
      }).catch(() => undefined);
    }
  }, [household.id, query, queryError, showArchived, statusFilter]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const cached = await loadInventorySnapshot(household.id);
      if (active && cached) {
        setItems(cached.items);
        setCategories(cached.categories);
        setDashboard(cached.dashboard);
      }
      try {
        await refresh();
      } catch (loadError) {
        if (!active) return;
        if (cached) {
          setOffline(true);
        } else {
          setError(errorMessage(loadError));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [household.id, refresh]);

  useEffect(() => {
    if (refreshSignal === 0) return;
    const timer = setTimeout(() => {
      void refresh().catch(() => setOffline(true));
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh, refreshSignal]);

  async function runAction(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
    } catch (actionError) {
      setError(errorMessage(actionError));
      if (actionError instanceof ApiError && actionError.code === 'inventory.version_conflict') {
        try {
          await refresh();
        } catch {
          setOffline(true);
        }
      }
    } finally {
      setBusy(undefined);
    }
  }

  function openForm(item?: InventoryItem) {
    formValidation.reset();
    setEditing(item);
    setName(item?.name ?? '');
    setQuantity(item?.quantity?.toString() ?? '');
    setUnit(item?.unit ?? '');
    setNotes(item?.notes ?? '');
    setCategoryId(item?.category?.id);
    setShowForm(true);
    setError(undefined);
    setNotice(undefined);
  }

  function closeForm() {
    formValidation.reset();
    setShowForm(false);
    setEditing(undefined);
  }

  async function saveItem() {
    const parsedQuantity = quantity.trim() ? Number(quantity) : null;
    if (parsedQuantity !== null && (!Number.isFinite(parsedQuantity) || parsedQuantity < 0)) {
      setError('Quantity must be zero or greater.');
      return;
    }
    const input: InventoryItemInput = {
      name: name.trim(),
      quantity: parsedQuantity,
      unit: unit.trim() || null,
      notes: notes.trim() || null,
      categoryId: categoryId ?? null,
    };
    const result = editing
      ? await updateInventoryItem(household.id, editing, input)
      : await createInventoryItem(household.id, { ...input, status: 'ok' });
    closeForm();
    await refresh();
    setNotice(
      result.warnings[0]?.message ?? `${result.item.name} was ${editing ? 'updated' : 'added'}.`,
    );
  }

  async function addCategory() {
    const response = await createCategory(household.id, newCategory.trim());
    setNewCategory('');
    formValidation.clear('newCategory');
    setCategories((current) => [...current, response.category]);
    setCategoryId(response.category.id);
    setNotice(`${response.category.name} category created.`);
  }

  async function confirmArchive(item: InventoryItem) {
    return confirmAction({
      title: 'Archive item?',
      message: `${item.name} will leave the active inventory.`,
      confirmLabel: 'Archive',
      destructive: true,
    });
  }

  if (loading && items.length === 0) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.loading}>
        <ActivityIndicator color={colors.brand[600]} />
        <Text style={sharedStyles.secondary}>Loading inventory…</Text>
      </View>
    );
  }

  return (
    <View style={sharedStyles.stack}>
      {offline ? (
        <Message type="error">
          You’re offline. Showing the last saved inventory; changes are not queued.
        </Message>
      ) : null}
      {notice ? <Message type="success">{notice}</Message> : null}
      {error ? <Message type="error">{error}</Message> : null}

      <Card>
        <Text style={sharedStyles.sectionTitle}>Needs attention</Text>
        <View style={styles.summaryRow}>
          <SummaryValue label="LOW" value={dashboard.summary.low} tone="low" />
          <SummaryValue label="OUT" value={dashboard.summary.out} tone="out" />
          <SummaryValue label="TOTAL" value={dashboard.summary.total} tone="ok" />
        </View>
        <Text style={sharedStyles.secondary}>
          {dashboard.summary.updatedAt
            ? `Updated ${new Date(dashboard.summary.updatedAt).toLocaleString()}`
            : 'No inventory updates yet.'}
        </Text>
      </Card>

      <Card>
        <Text style={sharedStyles.sectionTitle}>Inventory</Text>
        <Field
          autoCapitalize="none"
          error={filterValidation.error('query', queryError)}
          label="Search items"
          onChangeText={filterValidation.bind('query', setQuery)}
          placeholder="Milk, soap, rice…"
          value={query}
        />
        <View style={sharedStyles.row}>
          <FilterButton active={!statusFilter} label="All" onPress={() => setStatusFilter(undefined)} />
          {STATUSES.map((status) => (
            <FilterButton
              active={statusFilter === status}
              key={status}
              label={status.toUpperCase()}
              onPress={() => setStatusFilter(status)}
            />
          ))}
        </View>
        <View style={sharedStyles.row}>
          <Button
            disabled={Boolean(queryError)}
            label="Apply filters"
            loading={busy === 'filter'}
            onPress={() => void runAction('filter', refresh)}
            variant="secondary"
          />
          <Button
            label={showArchived ? 'Show active' : 'Show archived'}
            onPress={() => {
              setShowArchived((current) => !current);
              setItems([]);
            }}
            variant="text"
          />
          {!showArchived ? <Button label="Add item" onPress={() => openForm()} /> : null}
        </View>
      </Card>

      {showForm ? (
        <Card>
          <Text style={sharedStyles.sectionTitle}>{editing ? `Edit ${editing.name}` : 'Add item'}</Text>
          <Field
            error={formValidation.error('name', nameError)}
            label="Item name"
            onChangeText={formValidation.bind('name', setName)}
            value={name}
          />
          <Field
            error={formValidation.error('quantity', quantityError)}
            keyboardType="decimal-pad"
            label="Quantity (optional)"
            onChangeText={formValidation.bind('quantity', setQuantity)}
            value={quantity}
          />
          <Field
            error={formValidation.error('unit', unitError)}
            label="Unit (optional)"
            onChangeText={formValidation.bind('unit', setUnit)}
            placeholder="kg, rolls, bottles"
            value={unit}
          />
          <Field
            error={formValidation.error('notes', notesError)}
            label="Notes (optional)"
            multiline
            onChangeText={formValidation.bind('notes', setNotes)}
            value={notes}
          />
          <Text style={styles.label}>Category</Text>
          <View style={sharedStyles.row}>
            <FilterButton active={!categoryId} label="None" onPress={() => setCategoryId(undefined)} />
            {categories.map((category) => (
              <FilterButton
                active={category.id === categoryId}
                key={category.id}
                label={category.name}
                onPress={() => setCategoryId(category.id)}
              />
            ))}
          </View>
          <Field
            error={formValidation.error('newCategory', newCategoryError)}
            label="New category"
            onChangeText={formValidation.bind('newCategory', setNewCategory)}
            value={newCategory}
          />
          <Button
            disabled={Boolean(newCategoryError)}
            label="Create category"
            loading={busy === 'category'}
            onPress={() => void runAction('category', addCategory)}
            variant="secondary"
          />
          <Button
            disabled={Boolean(nameError || quantityError || unitError || notesError)}
            label={editing ? 'Save item' : 'Add item'}
            loading={busy === 'save'}
            onPress={() => void runAction('save', saveItem)}
          />
          <Button label="Cancel" onPress={closeForm} variant="text" />
        </Card>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <Text style={sharedStyles.sectionTitle}>
            {showArchived ? 'No archived items' : 'Your inventory is ready'}
          </Text>
          <Text style={sharedStyles.secondary}>
            {showArchived
              ? 'Archived items will appear here and can be restored.'
              : 'Add the first household item to start tracking what is low or out.'}
          </Text>
          {!showArchived ? <Button label="Add your first item" onPress={() => openForm()} /> : null}
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id} testID="inventory-item">
            <View style={styles.itemHeader}>
              <View style={styles.itemIdentity}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={sharedStyles.secondary}>
                  {[item.category?.name, quantityLabel(item)].filter(Boolean).join(' · ') || 'No details'}
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
            {item.notes ? <Text style={sharedStyles.body}>{item.notes}</Text> : null}
            {!showArchived ? (
              <View style={sharedStyles.row}>
                {STATUSES.map((status) => (
                  <FilterButton
                    active={item.status === status}
                    key={status}
                    label={status.toUpperCase()}
                    onPress={() => {
                      if (item.status === status) return;
                      void runAction(`status-${item.id}`, async () => {
                        const response = await changeInventoryStatus(household.id, item, status);
                        await refresh();
                        if (response.shopping.automaticallyAdded) {
                          setNotice(`${item.name} is OUT and was added to shopping.`);
                        } else {
                          setNotice(`${item.name} is now ${status.toUpperCase()}.`);
                        }
                        if (response.shopping.shouldPrompt) {
                          Alert.alert(
                            'Add to shopping?',
                            `${item.name} is OUT. Add it to the household shopping list?`,
                            [
                              { text: 'Not now', style: 'cancel' },
                              {
                                text: 'Add',
                                onPress: () =>
                                  void runAction(`shopping-${item.id}`, async () => {
                                    await createShoppingEntry(household.id, { inventoryItemId: item.id });
                                    setNotice(`${item.name} was added to shopping.`);
                                  }),
                              },
                            ],
                          );
                        }
                      });
                    }}
                  />
                ))}
              </View>
            ) : null}
            <View style={sharedStyles.row}>
              {!showArchived ? <Button label="Edit" onPress={() => openForm(item)} variant="secondary" /> : null}
              <Button
                label={showArchived ? 'Restore' : 'Archive'}
                loading={busy === `archive-${item.id}`}
                onPress={() =>
                  void runAction(`archive-${item.id}`, async () => {
                    if (!showArchived && !(await confirmArchive(item))) return;
                    await setInventoryArchived(household.id, item, !showArchived);
                    await refresh();
                    setNotice(`${item.name} was ${showArchived ? 'restored' : 'archived'}.`);
                  })
                }
                variant={showArchived ? 'secondary' : 'danger'}
              />
            </View>
          </Card>
        ))
      )}

      <Card>
        <Text style={sharedStyles.sectionTitle}>Recent activity</Text>
        {dashboard.recentActivity.length === 0 ? (
          <Text style={sharedStyles.secondary}>Inventory changes will appear here.</Text>
        ) : (
          dashboard.recentActivity.map((activity) => (
            <View key={activity.id} style={styles.activityRow}>
              <Text style={sharedStyles.body}>{activity.message}</Text>
              <Text style={sharedStyles.secondary}>
                {new Date(activity.createdAt).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403) {
    return 'You do not have permission to view this household inventory.';
  }
  return error instanceof Error ? error.message : 'Domi could not load inventory.';
}

function quantityLabel(item: InventoryItem) {
  if (item.quantity === null) return undefined;
  return `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`;
}

function SummaryValue({ label, value, tone }: { label: string; value: number; tone: InventoryStatus }) {
  return (
    <View style={styles.summaryValue}>
      <Text style={[styles.summaryNumber, { color: statusColor(tone) }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: InventoryStatus }) {
  return (
    <View accessibilityLabel={`Status ${status.toUpperCase()}`} style={[styles.badge, { borderColor: statusColor(status) }]}>
      <Text style={[styles.badgeText, { color: statusColor(status) }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

function FilterButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.filter, active && styles.filterActive]}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

function statusColor(status: InventoryStatus) {
  return status === 'out' ? colors.status.out : status === 'low' ? colors.status.low : colors.status.ok;
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: spacing[3], padding: spacing[8] },
  summaryRow: { flexDirection: 'row', gap: spacing[6] },
  summaryValue: { alignItems: 'center', minWidth: 56 },
  summaryNumber: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  summaryLabel: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },
  filter: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  filterActive: { backgroundColor: colors.brand[100], borderColor: colors.brand[600] },
  filterText: { color: colors.text.secondary, fontSize: 14, fontWeight: '600' },
  filterTextActive: { color: colors.brand[700] },
  label: { color: colors.text.primary, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  itemHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing[3] },
  itemIdentity: { flex: 1, gap: spacing[1] },
  itemName: { color: colors.text.primary, fontSize: 18, fontWeight: '600', lineHeight: 24 },
  badge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
  badgeText: { fontSize: 13, fontWeight: '700' },
  activityRow: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing[1], paddingTop: spacing[3] },
});
