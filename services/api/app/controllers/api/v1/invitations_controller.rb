require "cgi"

module Api
  module V1
    class InvitationsController < BaseController
      before_action :authenticate_user!
      rate_limit to: 20, within: 1.hour, only: %i[create accept], with: RATE_LIMIT_RESPONSE

      def index
        household = find_household!
        require_owner!(household)
        invitations = household.household_invitations.includes(:created_by).order(created_at: :desc)
        render json: { invitations: invitations.map { |invitation| InvitationSerializer.render(invitation) } }
      end

      def create
        household = find_household!
        result = Households::CreateInvitation.call(household:, actor: current_user)
        render json: {
          invitation: InvitationSerializer.render(result.invitation),
          token: result.token,
          inviteUrl: "#{ENV.fetch('MOBILE_APP_SCHEME', 'domi://')}join?token=#{CGI.escape(result.token)}"
        }, status: :created
      end

      def destroy
        household = find_household!
        require_owner!(household)
        invitation = household.household_invitations.find(params[:id])
        invitation.update!(revoked_at: Time.current)
        head :no_content
      end

      def accept
        membership = Households::AcceptInvitation.call(
          user: current_user,
          token: params.require(:token)
        )
        render json: {
          household: HouseholdSerializer.render(membership.household, membership:)
        }, status: :created
      end
    end
  end
end
