module Shopping
  class SetPurchased
    def self.call(household:, actor:, entry:, purchased:, expected_version:)
      Authorization.ensure_member!(household:, actor:)

      ShoppingEntry.transaction do
        entry.lock!
        Versioning.ensure!(entry, expected_version)
        return entry if entry.purchased == purchased

        entry.update!(
          purchased:,
          checked_at: purchased ? Time.current : nil,
          updated_by: actor
        )
        Activities::Record.call(
          household:,
          actor:,
          action: purchased ? "shopping.entry_checked" : "shopping.entry_unchecked",
          subject: entry,
          metadata: { itemName: entry.name }
        )
        entry
      end
    end
  end
end
