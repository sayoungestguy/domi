module Inventory
  class ChangeStatus
    ShoppingOutcome = Data.define(:automatically_added, :should_prompt, :entry)
    Result = Data.define(:item, :shopping)

    def self.call(household:, actor:, item:, status:, expected_version:)
      Authorization.ensure_member!(household:, actor:)

      InventoryItem.transaction do
        item.lock!
        Versioning.ensure!(item, expected_version)
        return Result.new(item:, shopping: no_shopping_action) if item.status == status

        previous_status = item.status
        item.update!(status:, updated_by: actor)
        Activities::Record.call(
          household:,
          actor:,
          action: "inventory.status_changed",
          subject: item,
          metadata: { itemName: item.name, fromStatus: previous_status, toStatus: item.status }
        )
        Result.new(item:, shopping: shopping_outcome(household:, actor:, item:))
      end
    end

    def self.shopping_outcome(household:, actor:, item:)
      return no_shopping_action unless item.status == "out"

      preference = Shopping::Preference.call(household:)
      if preference.auto_add_out_items
        result = Shopping::EnsureEntryForInventoryItem.call(household:, actor:, inventory_item: item)
        return ShoppingOutcome.new(
          automatically_added: result.created,
          should_prompt: false,
          entry: result.entry
        )
      end

      existing = household.shopping_list&.shopping_entries&.active&.exists?(inventory_item: item)
      ShoppingOutcome.new(automatically_added: false, should_prompt: !existing, entry: nil)
    end
    private_class_method :shopping_outcome

    def self.no_shopping_action
      ShoppingOutcome.new(automatically_added: false, should_prompt: false, entry: nil)
    end
    private_class_method :no_shopping_action
  end
end
