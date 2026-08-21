module Api
  module V1
    class TokenRefreshesController < BaseController
      rate_limit to: 20, within: 5.minutes, only: :create, with: RATE_LIMIT_RESPONSE

      def create
        result = Authentication::RefreshSession.call(
          refresh_token: params.require(:refreshToken),
          user_agent: request.user_agent,
          ip_address: request.remote_ip
        )
        render json: { session: session_payload(result) }, status: :created
      end
    end
  end
end
