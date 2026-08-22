module Inventory
  class ChangeStatus
    def self.call(household:, actor:, item:, status:, expected_version:)
      Authorization.ensure_member!(household:, actor:)

      InventoryItem.transaction do
        item.lock!
        Versioning.ensure!(item, expected_version)
        return item if item.status == status

        previous_status = item.status
        item.update!(status:, updated_by: actor)
        Activities::Record.call(
          household:,
          actor:,
          action: "inventory.status_changed",
          subject: item,
          metadata: { itemName: item.name, fromStatus: previous_status, toStatus: item.status }
        )
        item
      end
    end
  end
end
