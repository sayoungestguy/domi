module Api
  module V1
    class NotificationPreferencesController < BaseController
      before_action :authenticate_user!

      def show
        render json: { notificationPreference: NotificationPreferenceSerializer.render(preference) }
      end

      def update
        preference.update!(preference_params)
        render json: { notificationPreference: NotificationPreferenceSerializer.render(preference) }
      end

      private

      def preference
        household = find_household!
        household.notification_preferences.find_or_create_by!(user: current_user)
      end

      def preference_params
        input = params.require(:notificationPreference).permit(
          :memberJoined, :shoppingEntryAdded, :shoppingTripCompleted
        ).to_h
        {
          member_joined: boolean(input, "memberJoined"),
          shopping_entry_added: boolean(input, "shoppingEntryAdded"),
          shopping_trip_completed: boolean(input, "shoppingTripCompleted")
        }
      end

      def boolean(input, key)
        raise ActionController::ParameterMissing, key unless input.key?(key)

        ActiveModel::Type::Boolean.new.cast(input.fetch(key))
      end
    end
  end
end
