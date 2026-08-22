module Shopping
  class RemoveEntry
    def self.call(household:, actor:, entry:, expected_version:)
      Authorization.ensure_member!(household:, actor:)

      ShoppingEntry.transaction do
        entry.lock!
        Versioning.ensure!(entry, expected_version)
        entry.update!(removed_at: Time.current, updated_by: actor)
        Activities::Record.call(
          household:,
          actor:,
          action: "shopping.entry_removed",
          subject: entry,
          metadata: { itemName: entry.name }
        )
        entry
      end
    end
  end
end
