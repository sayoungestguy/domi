module Api
  module V1
    class EmailVerificationsController < BaseController
      rate_limit to: 10, within: 1.hour, with: RATE_LIMIT_RESPONSE

      def create
        user = Accounts::VerifyEmail.call(token: params.require(:token))
        result = issue_session(user)
        render json: { user: UserSerializer.render(user), session: session_payload(result) }
      end

      def resend
        user = User.find_by(email: params.require(:email).to_s.strip.downcase)
        if user && !user.email_verified?
          token = user.issue_email_verification_token!
          UserMailer.email_verification(user, token).deliver_later
        end
        head :accepted
      end
    end
  end
end
