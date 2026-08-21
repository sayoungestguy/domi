module Api
  module V1
    class SessionsController < BaseController
      before_action :authenticate_user!, only: :destroy
      rate_limit to: 10, within: 5.minutes, only: :create, with: RATE_LIMIT_RESPONSE

      def create
        user = User.find_by(email: params.dig(:session, :email).to_s.strip.downcase)
        invalid_credentials! unless user&.authenticate(params.dig(:session, :password).to_s)

        unless user.email_verified?
          raise DomainError.new(
            code: "account.email_not_verified",
            message: "Verify your email address before signing in.",
            status: :forbidden
          )
        end

        result = issue_session(user)
        render json: { user: UserSerializer.render(user), session: session_payload(result) }, status: :created
      end

      def destroy
        AuthSession.where(token_family_id: current_auth_session.token_family_id, revoked_at: nil)
          .update_all(revoked_at: Time.current, updated_at: Time.current)
        head :no_content
      end

      private

      def invalid_credentials!
        raise DomainError.new(
          code: "auth.invalid_credentials",
          message: "The email address or password is incorrect.",
          status: :unauthorized
        )
      end
    end
  end
end
