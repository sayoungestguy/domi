module Api
  module V1
    class ShoppingListCompletionsController < BaseController
      before_action :authenticate_user!

      def create
        household = find_household!
        result = Shopping::CompleteTrip.call(
          household:,
          actor: current_user,
          idempotency_key: request.headers["Idempotency-Key"],
          restock_inventory_items: ActiveModel::Type::Boolean.new.cast(
            params.require(:restockInventoryItems)
          )
        )
        preference = Shopping::Preference.call(household:)
        render json: {
          trip: ShoppingTripSerializer.render(result.trip),
          shoppingList: ShoppingListSerializer.render(result.trip.shopping_list, preference:)
        }, status: result.created ? :created : :ok
      end
    end
  end
end
