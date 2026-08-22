module Inventory
  module Warnings
    module_function

    def duplicate_name(household:, name:, excluding: nil)
      matches = household.inventory_items.active.where(name: name.to_s.strip)
      matches = matches.where.not(id: excluding.id) if excluding
      return [] unless matches.exists?

      [ {
        code: "inventory.duplicate_name",
        message: "An active item with this name already exists."
      } ]
    end
  end
end
