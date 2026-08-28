module Shopping
  class TripHistory
    LIMIT = 20

    def self.call(household:, actor:)
      Authorization.ensure_member!(household:, actor:)
      household.shopping_trips
        .includes(:completed_by, shopping_trip_items: :inventory_item)
        .order(completed_at: :desc, id: :desc)
        .limit(LIMIT)
    end
  end
end
