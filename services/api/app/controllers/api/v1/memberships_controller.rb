module Api
  module V1
    class MembershipsController < BaseController
      before_action :authenticate_user!

      def index
        household = find_household!
        memberships = household.household_memberships.includes(:user).order(:created_at)
        render json: { memberships: memberships.map { |membership| MembershipSerializer.render(membership) } }
      end

      def destroy
        household = find_household!
        target = household.household_memberships.find(params[:id])
        Households::RemoveMember.call(household:, actor: current_user, target_membership: target)
        head :no_content
      end

      def leave
        household = find_household!
        Households::Leave.call(household:, user: current_user)
        head :no_content
      end

      def transfer
        household = find_household!
        target = household.household_memberships.find(params.require(:membershipId))
        membership = Households::TransferOwnership.call(
          household:,
          actor: current_user,
          target_membership: target
        )
        render json: { membership: MembershipSerializer.render(membership.reload) }
      end
    end
  end
end
