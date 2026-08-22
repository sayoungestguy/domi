module Shopping
  class UpdateEntry
    def self.call(household:, actor:, entry:, expected_version:, attributes:)
      Authorization.ensure_member!(household:, actor:)

      ShoppingEntry.transaction do
        entry.lock!
        Versioning.ensure!(entry, expected_version)
        entry.update!(**attributes, updated_by: actor)
        Activities::Record.call(
          household:,
          actor:,
          action: "shopping.entry_updated",
          subject: entry,
          metadata: { itemName: entry.name }
        )
        entry
      end
    end
  end
end
