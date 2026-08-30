module Shopping
  class CreateEntry
    Result = Data.define(:entry, :created)

    def self.call(household:, actor:, attributes:, idempotency_key:)
      Authorization.ensure_member!(household:, actor:)
      validate_idempotency_key!(idempotency_key)
      list = ActiveList.call(household:)
      existing = list.shopping_entries.find_by(idempotency_key:)
      return Result.new(entry: existing, created: false) if existing

      inventory_item = resolve_inventory_item(household, attributes.delete(:inventory_item_id))
      existing = list.shopping_entries.active.find_by(inventory_item:) if inventory_item
      return Result.new(entry: existing, created: false) if existing

      entry = ShoppingEntry.transaction(requires_new: true) do
        record = list.shopping_entries.create!(
          **attributes,
          name: inventory_item&.name || attributes[:name],
          inventory_item:,
          idempotency_key:,
          added_by: actor,
          updated_by: actor
        )
        Activities::Record.call(
          household:,
          actor:,
          action: "shopping.entry_added",
          subject: record,
          metadata: { itemName: record.name, linkedInventoryItemId: inventory_item&.id }
        )
        Notifications::FanOut.call(
          household:, actor:, kind: "shopping_entry_added", subject: record
        )
        record
      end
      Result.new(entry:, created: true)
    rescue ActiveRecord::RecordNotUnique
      entry = list.shopping_entries.find_by(idempotency_key:)
      entry ||= list.shopping_entries.active.find_by(inventory_item:) if inventory_item
      raise unless entry

      Result.new(entry:, created: false)
    end

    def self.validate_idempotency_key!(key)
      return if key.to_s.length.between?(8, 255)

      raise DomainError.new(
        code: "shopping.idempotency_key_required",
        message: "A valid Idempotency-Key header is required.",
        status: :bad_request
      )
    end
    private_class_method :validate_idempotency_key!

    def self.resolve_inventory_item(household, inventory_item_id)
      return if inventory_item_id.blank?

      household.inventory_items.active.find(inventory_item_id)
    end
    private_class_method :resolve_inventory_item
  end
end
