module ShoppingListSerializer
  module_function

  def render(list, preference:)
    entries = list.shopping_entries.active.includes(:added_by, :updated_by).order(:purchased, :created_at, :id)
    {
      id: list.id,
      householdId: list.household_id,
      entries: entries.map { |entry| ShoppingEntrySerializer.render(entry) },
      remainingCount: entries.count { |entry| !entry.purchased },
      purchasedCount: entries.count(&:purchased),
      autoAddOutItems: preference.auto_add_out_items,
      updatedAt: entries.max_by(&:updated_at)&.updated_at&.iso8601
    }
  end
end
