module InventoryItemSerializer
  module_function

  def render(item)
    {
      id: item.id,
      householdId: item.household_id,
      name: item.name,
      status: item.status,
      quantity: item.quantity&.to_f,
      unit: item.unit,
      notes: item.notes,
      category: item.category && CategorySerializer.render(item.category),
      version: item.lock_version,
      archivedAt: item.archived_at&.iso8601,
      updatedBy: UserSerializer.render(item.updated_by),
      createdAt: item.created_at.iso8601,
      updatedAt: item.updated_at.iso8601
    }
  end
end
