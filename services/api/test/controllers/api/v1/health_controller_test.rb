require "test_helper"

module Api
  module V1
    class HealthControllerTest < ActionDispatch::IntegrationTest
      test "returns the versioned API health contract" do
        get api_v1_health_url

        assert_response :success
        assert_equal(
          {
            "status" => "ok",
            "service" => "domi-api",
            "version" => "development"
          },
          response.parsed_body
        )
      end
    end
  end
end
