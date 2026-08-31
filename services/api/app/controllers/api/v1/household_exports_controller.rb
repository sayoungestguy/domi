module Api
  module V1
    class HouseholdExportsController < BaseController
      before_action :authenticate_user!

      def show
        household = find_household!
        render json: { export: Privacy::ExportHousehold.call(household:, actor: current_user) }
      end
    end
  end
end
