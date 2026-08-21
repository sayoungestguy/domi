module Api
  module V1
    class MeController < BaseController
      before_action :authenticate_user!

      def show
        render json: { user: UserSerializer.render(current_user) }
      end

      def update
        current_user.update!(display_name: params.require(:user).require(:displayName))
        render json: { user: UserSerializer.render(current_user) }
      end
    end
  end
end
