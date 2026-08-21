module Api
  module V1
    class PasswordResetsController < BaseController
      rate_limit to: 5, within: 1.hour, with: RATE_LIMIT_RESPONSE

      def create
        Accounts::RequestPasswordReset.call(email: params.require(:email))
        head :accepted
      end

      def update
        user = Accounts::ResetPassword.call(
          token: params.require(:token),
          password: params.require(:password),
          password_confirmation: params.require(:passwordConfirmation)
        )
        result = issue_session(user)
        render json: { user: UserSerializer.render(user), session: session_payload(result) }
      end
    end
  end
end
