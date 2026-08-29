module Api
  module V1
    class ShoppingPreferencesController < BaseController
      before_action :authenticate_user!

      def update
        household = find_household!
        Shopping::Authorization.ensure_member!(household:, actor: current_user)
        preference = Shopping::Preference.call(household:)
        enabled = ActiveModel::Type::Boolean.new.cast(params.require(:autoAddOutItems))
        HouseholdPreference.transaction do
          preference.lock!
          preference.update!(auto_add_out_items: enabled)
          Activities::Record.call(
            household:,
            actor: current_user,
            action: "shopping.preference_updated",
            subject: preference,
            metadata: { autoAddOutItems: enabled }
          )
        end
        render json: { autoAddOutItems: preference.auto_add_out_items }
      end
    end
  end
end
