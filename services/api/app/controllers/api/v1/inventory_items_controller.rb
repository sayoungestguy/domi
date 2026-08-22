module Api
  module V1
    class InventoryItemsController < BaseController
      before_action :authenticate_user!

      def index
        household = find_household!
        items = Inventory::ListItems.call(
          household:,
          query: params[:query],
          status: validated_status,
          category_id: params[:categoryId],
          archived: ActiveModel::Type::Boolean.new.cast(params[:archived])
        )
        render json: { items: items.map { |item| InventoryItemSerializer.render(item) } }
      end

      def show
        household = find_household!
        item = household.inventory_items.includes(:category, :updated_by).find(params[:id])
        render json: { item: InventoryItemSerializer.render(item) }
      end

      def create
        household = find_household!
        result = Inventory::CreateItem.call(
          household:,
          actor: current_user,
          attributes: item_params.to_h.symbolize_keys
        )
        render json: item_result(result.item, result.warnings), status: :created
      end

      def update
        household = find_household!
        item = household.inventory_items.active.find(params[:id])
        result = Inventory::UpdateItem.call(
          household:,
          actor: current_user,
          item:,
          expected_version: expected_version!,
          attributes: item_params.to_h.symbolize_keys
        )
        render json: item_result(result.item, result.warnings)
      end

      def status
        household = find_household!
        item = household.inventory_items.active.find(params[:id])
        result = Inventory::ChangeStatus.call(
          household:,
          actor: current_user,
          item:,
          status: params.require(:status),
          expected_version: expected_version!
        )
        render json: {
          item: InventoryItemSerializer.render(result.item),
          shopping: {
            automaticallyAdded: result.shopping.automatically_added,
            shouldPrompt: result.shopping.should_prompt,
            entry: result.shopping.entry && ShoppingEntrySerializer.render(result.shopping.entry)
          }
        }
      end

      def archive
        set_archived(true)
      end

      def restore
        set_archived(false)
      end

      private

      def item_params
        permitted = params.require(:inventoryItem).permit(
          :name, :status, :quantity, :unit, :notes, :categoryId
        ).to_h
        permitted[:category_id] = permitted.delete("categoryId") if permitted.key?("categoryId")
        permitted
      end

      def expected_version!
        value = request.headers["If-Match"].presence || params[:expectedVersion]
        normalized = value.to_s.delete_prefix("W/").delete('"')
        return normalized.to_i if normalized.match?(/\A\d+\z/)

        raise ActionController::ParameterMissing, :expectedVersion
      end

      def validated_status
        return if params[:status].blank?
        return params[:status] if InventoryItem::STATUSES.include?(params[:status])

        raise DomainError.new(
          code: "inventory.invalid_status",
          message: "Status must be OK, LOW, or OUT.",
          status: :unprocessable_entity
        )
      end

      def set_archived(archived)
        household = find_household!
        scope = archived ? household.inventory_items.active : household.inventory_items.archived
        item = scope.find(params[:id])
        item = Inventory::SetArchived.call(
          household:,
          actor: current_user,
          item:,
          archived:,
          expected_version: expected_version!
        )
        render json: { item: InventoryItemSerializer.render(item) }
      end

      def item_result(item, warnings)
        { item: InventoryItemSerializer.render(item), warnings: }
      end
    end
  end
end
