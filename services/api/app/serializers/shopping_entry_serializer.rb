module ShoppingEntrySerializer
  module_function

  def render(entry)
    {
      id: entry.id,
      householdId: entry.shopping_list.household_id,
      name: entry.name,
      quantity: entry.quantity&.to_f,
      note: entry.note,
      purchased: entry.purchased,
      checkedAt: entry.checked_at&.iso8601,
      inventoryItemId: entry.inventory_item_id,
      version: entry.lock_version,
      addedBy: UserSerializer.render(entry.added_by),
      updatedBy: UserSerializer.render(entry.updated_by),
      createdAt: entry.created_at.iso8601,
      updatedAt: entry.updated_at.iso8601
    }
  end
end
