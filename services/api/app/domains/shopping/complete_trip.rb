module Shopping
  class CompleteTrip
    Result = Data.define(:trip, :created)

    def self.call(
      household:,
      actor:,
      idempotency_key:,
      restock_inventory_items:,
      activity_recorder: Activities::Record
    )
      Authorization.ensure_member!(household:, actor:)
      validate_idempotency_key!(idempotency_key)
      list = ActiveList.call(household:)

      ShoppingList.transaction do
        list.lock!
        existing = list.shopping_trips.find_by(idempotency_key:)
        return Result.new(trip: existing, created: false) if existing

        entries = list.shopping_entries.purchased.order(:checked_at, :id).lock.to_a
        raise_no_purchased_entries! if entries.empty?

        completed_at = Time.current
        snapshots = entries.map do |entry|
          snapshot_entry(entry, actor:, restock_inventory_items:)
        end
        restocked_count = snapshots.count { |snapshot| snapshot.fetch(:restocked) }
        trip = list.shopping_trips.create!(
          household:,
          completed_by: actor,
          idempotency_key:,
          restock_inventory_items:,
          purchased_count: entries.length,
          restocked_count:,
          completed_at:
        )
        trip.shopping_trip_items.create!(snapshots)
        entries.each { |entry| entry.update!(removed_at: completed_at, updated_by: actor) }
        list.touch
        activity_recorder.call(
          household:,
          actor:,
          action: "shopping.trip_completed",
          subject: trip,
          metadata: { itemCount: entries.length, restockedCount: restocked_count }
        )

        Result.new(trip:, created: true)
      end
    end

    def self.snapshot_entry(entry, actor:, restock_inventory_items:)
      inventory_item = entry.inventory_item
      restocked = false
      if restock_inventory_items && inventory_item
        inventory_item.lock!
        if inventory_item.status != "ok"
          inventory_item.update!(status: "ok", updated_by: actor)
          restocked = true
        end
      end

      {
        source_entry: entry,
        inventory_item:,
        name: entry.name,
        quantity: entry.quantity,
        note: entry.note,
        checked_at: entry.checked_at,
        restocked:
      }
    end
    private_class_method :snapshot_entry

    def self.validate_idempotency_key!(key)
      return if key.to_s.length.between?(8, 255)

      raise DomainError.new(
        code: "shopping.idempotency_key_required",
        message: "A valid Idempotency-Key header is required.",
        status: :bad_request
      )
    end
    private_class_method :validate_idempotency_key!

    def self.raise_no_purchased_entries!
      raise DomainError.new(
        code: "shopping.no_purchased_entries",
        message: "Check off at least one item before finishing shopping.",
        status: :unprocessable_entity
      )
    end
    private_class_method :raise_no_purchased_entries!
  end
end
