module Inventory
  class SetArchived
    def self.call(household:, actor:, item:, archived:, expected_version:)
      Authorization.ensure_member!(household:, actor:)

      InventoryItem.transaction do
        item.lock!
        Versioning.ensure!(item, expected_version)
        item.update!(archived_at: archived ? Time.current : nil, updated_by: actor)
        action = archived ? "inventory.item_archived" : "inventory.item_restored"
        Activities::Record.call(
          household:,
          actor:,
          action:,
          subject: item,
          metadata: { itemName: item.name }
        )
        item
      end
    end
  end
end
