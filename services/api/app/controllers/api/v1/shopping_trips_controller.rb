module Api
  module V1
    class ShoppingTripsController < BaseController
      before_action :authenticate_user!

      def index
        household = find_household!
        trips = Shopping::TripHistory.call(household:, actor: current_user)
        render json: { trips: trips.map { |trip| ShoppingTripSerializer.render(trip) } }
      end
    end
  end
end
