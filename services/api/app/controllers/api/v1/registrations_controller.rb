module Api
  module V1
    class RegistrationsController < BaseController
      rate_limit to: 5, within: 1.hour, only: :create, with: RATE_LIMIT_RESPONSE

      def create
        account = params.require(:account)
        result = Accounts::Register.call(
          email: account.require(:email),
          display_name: account.require(:displayName),
          password: account.require(:password),
          password_confirmation: account.require(:passwordConfirmation)
        )
        render json: {
          user: UserSerializer.render(result.user),
          verificationRequired: true
        }, status: :created
      end
    end
  end
end
