module Shopping
  class EnsureEntryForInventoryItem
    def self.call(household:, actor:, inventory_item:, idempotency_key: SecureRandom.uuid)
      CreateEntry.call(
        household:,
        actor:,
        attributes: { inventory_item_id: inventory_item.id },
        idempotency_key:
      )
    end
  end
end
