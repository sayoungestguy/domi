module ShoppingTripItemSerializer
  module_function

  def render(item)
    {
      id: item.id,
      sourceEntryId: item.source_entry_id,
      inventoryItemId: item.inventory_item_id,
      name: item.name,
      quantity: item.quantity&.to_f,
      note: item.note,
      checkedAt: item.checked_at.iso8601,
      restocked: item.restocked
    }
  end
end
