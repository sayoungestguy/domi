module Api
  module V1
    class HealthController < BaseController
      def show
        render json: {
          status: "ok",
          service: "domi-api",
          version: ENV.fetch("APP_VERSION", "development")
        }
      end
    end
  end
end
