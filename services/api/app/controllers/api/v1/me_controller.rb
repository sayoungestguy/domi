module Api
  module V1
    class MeController < BaseController
      before_action :authenticate_user!
      rate_limit to: 5, within: 1.hour, only: :destroy, with: RATE_LIMIT_RESPONSE

      def show
        render json: { user: UserSerializer.render(current_user) }
      end

      def update
        current_user.update!(display_name: params.require(:user).require(:displayName))
        render json: { user: UserSerializer.render(current_user) }
      end

      def destroy
        unless params.require(:confirmation) == "DELETE MY ACCOUNT" &&
            current_user.authenticate(params.require(:currentPassword).to_s)
          raise DomainError.new(
            code: "privacy.confirmation_failed",
            message: "The password or account-deletion confirmation is incorrect.",
            status: :unprocessable_entity
          )
        end

        Privacy::DeleteAccount.call(user: current_user)
        Current.reset
        head :no_content
      end
    end
  end
end
