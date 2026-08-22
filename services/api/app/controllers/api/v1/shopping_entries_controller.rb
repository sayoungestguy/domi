module Api
  module V1
    class ShoppingEntriesController < BaseController
      before_action :authenticate_user!

      def create
        household = find_household!
        result = Shopping::CreateEntry.call(
          household:,
          actor: current_user,
          attributes: entry_params.to_h.symbolize_keys,
          idempotency_key: request.headers["Idempotency-Key"]
        )
        render json: { entry: ShoppingEntrySerializer.render(result.entry) },
          status: result.created ? :created : :ok
      end

      def update
        household = find_household!
        entry = active_entry!(household)
        entry = Shopping::UpdateEntry.call(
          household:,
          actor: current_user,
          entry:,
          expected_version: expected_version!,
          attributes: entry_update_params.to_h.symbolize_keys
        )
        render json: { entry: ShoppingEntrySerializer.render(entry) }
      end

      def purchased
        household = find_household!
        entry = active_entry!(household)
        entry = Shopping::SetPurchased.call(
          household:,
          actor: current_user,
          entry:,
          purchased: ActiveModel::Type::Boolean.new.cast(params.require(:purchased)),
          expected_version: expected_version!
        )
        render json: { entry: ShoppingEntrySerializer.render(entry) }
      end

      def destroy
        household = find_household!
        entry = active_entry!(household)
        Shopping::RemoveEntry.call(
          household:,
          actor: current_user,
          entry:,
          expected_version: expected_version!
        )
        head :no_content
      end

      private

      def active_entry!(household)
        list = Shopping::ActiveList.call(household:)
        list.shopping_entries.active.find(params[:id])
      end

      def entry_params
        permitted = params.require(:shoppingEntry).permit(:name, :quantity, :note, :inventoryItemId).to_h
        if permitted.key?("inventoryItemId")
          permitted[:inventory_item_id] = permitted.delete("inventoryItemId")
        end
        permitted
      end

      def entry_update_params
        params.require(:shoppingEntry).permit(:name, :quantity, :note)
      end

      def expected_version!
        value = request.headers["If-Match"].presence || params[:expectedVersion]
        normalized = value.to_s.delete_prefix("W/").delete('"')
        return normalized.to_i if normalized.match?(/\A\d+\z/)

        raise ActionController::ParameterMissing, :expectedVersion
      end
    end
  end
end
