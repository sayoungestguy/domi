module ShoppingTripSerializer
  module_function

  def render(trip)
    items = trip.shopping_trip_items.sort_by { |item| [ item.checked_at, item.id ] }
    {
      id: trip.id,
      householdId: trip.household_id,
      completedAt: trip.completed_at.iso8601,
      completedBy: UserSerializer.render(trip.completed_by),
      restockInventoryItems: trip.restock_inventory_items,
      purchasedCount: trip.purchased_count,
      restockedCount: trip.restocked_count,
      items: items.map { |item| ShoppingTripItemSerializer.render(item) }
    }
  end
end
