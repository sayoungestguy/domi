module Api
  module V1
    class AccountExportsController < BaseController
      before_action :authenticate_user!

      def show
        render json: { export: Privacy::ExportAccount.call(user: current_user) }
      end
    end
  end
end
