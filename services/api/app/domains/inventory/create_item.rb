module Inventory
  class CreateItem
    Result = Data.define(:item, :warnings)

    def self.call(household:, actor:, attributes:)
      Authorization.ensure_member!(household:, actor:)
      category = resolve_category(household, attributes.delete(:category_id))
      warnings = Warnings.duplicate_name(household:, name: attributes[:name])

      item = InventoryItem.transaction do
        record = household.inventory_items.create!(
          **attributes,
          category:,
          created_by: actor,
          updated_by: actor
        )
        Activities::Record.call(
          household:,
          actor:,
          action: "inventory.item_created",
          subject: record,
          metadata: { itemName: record.name, status: record.status }
        )
        record
      end

      Result.new(item:, warnings:)
    end

    def self.resolve_category(household, category_id)
      return if category_id.blank?

      household.categories.active.find(category_id)
    end
    private_class_method :resolve_category
  end
end
