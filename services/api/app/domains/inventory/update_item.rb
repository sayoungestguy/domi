module Inventory
  class UpdateItem
    Result = Data.define(:item, :warnings)

    def self.call(household:, actor:, item:, expected_version:, attributes:)
      Authorization.ensure_member!(household:, actor:)

      result = InventoryItem.transaction do
        item.lock!
        Versioning.ensure!(item, expected_version)
        category_supplied = attributes.key?(:category_id)
        category_id = attributes.delete(:category_id) if category_supplied
        attributes[:category] = resolve_category(household, category_id) if category_supplied
        changed_fields = attributes.keys.map { |key| key.to_s.camelize(:lower) }
        item.update!(**attributes, updated_by: actor)
        Activities::Record.call(
          household:,
          actor:,
          action: "inventory.item_updated",
          subject: item,
          metadata: { itemName: item.name, changedFields: changed_fields }
        )
        item
      end

      Result.new(item: result, warnings: Warnings.duplicate_name(household:, name: result.name, excluding: result))
    end

    def self.resolve_category(household, category_id)
      return if category_id.blank?

      household.categories.active.find(category_id)
    end
    private_class_method :resolve_category
  end
end
