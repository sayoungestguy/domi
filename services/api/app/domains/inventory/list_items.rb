module Inventory
  class ListItems
    def self.call(household:, query: nil, status: nil, category_id: nil, archived: false)
      scope = archived ? household.inventory_items.archived : household.inventory_items.active
      scope = scope.where(status:) if status.present?
      scope = scope.where(category_id:) if category_id.present?
      if query.present?
        normalized_query = query.to_s.strip
        if normalized_query.length > 120
          raise DomainError.new(
            code: "inventory.search_too_long",
            message: "Search must be 120 characters or fewer.",
            status: :unprocessable_entity
          )
        end
        pattern = "%#{ActiveRecord::Base.sanitize_sql_like(normalized_query)}%"
        scope = scope.where("inventory_items.name ILIKE ?", pattern)
      end
      scope.includes(:category, :updated_by).order(:name, :id)
    end
  end
end
