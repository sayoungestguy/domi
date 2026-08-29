module Api
  module V1
    class RealtimeStatesController < BaseController
      before_action :authenticate_user!

      def show
        household = find_household!
        render json: {
          realtimeState: {
            householdId: household.id,
            currentSequence: household.realtime_sequence
          }
        }
      end
    end
  end
end
