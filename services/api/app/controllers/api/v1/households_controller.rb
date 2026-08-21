module Api
  module V1
    class HouseholdsController < BaseController
      before_action :authenticate_user!

      def index
        memberships = current_user.household_memberships.includes(:household).order(created_at: :asc)
        render json: {
          households: memberships.map do |membership|
            HouseholdSerializer.render(membership.household, membership:)
          end
        }
      end

      def show
        household = find_household!
        membership = HouseholdPolicy.new(current_user, household).membership
        render json: { household: HouseholdSerializer.render(household, membership:) }
      end

      def create
        household = Households::Create.call(
          user: current_user,
          name: params.require(:household).require(:name),
          timezone: params.require(:household).fetch(:timezone, "Etc/UTC")
        )
        render json: {
          household: HouseholdSerializer.render(household, membership: household.owner_membership)
        }, status: :created
      end

      def update
        household = find_household!
        require_owner!(household)
        household.update!(params.require(:household).permit(:name, :timezone))
        render json: {
          household: HouseholdSerializer.render(household, membership: household.owner_membership)
        }
      end
    end
  end
end
