module Api
  module V1
    class ShoppingListsController < BaseController
      before_action :authenticate_user!

      def show
        household = find_household!
        list = Shopping::ActiveList.call(household:)
        preference = Shopping::Preference.call(household:)
        render json: { shoppingList: ShoppingListSerializer.render(list, preference:) }
      end
    end
  end
end
