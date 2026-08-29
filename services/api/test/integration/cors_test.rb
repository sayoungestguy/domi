require "test_helper"

class CorsTest < ActionDispatch::IntegrationTest
  test "local Expo web origin receives API CORS headers" do
    get "/api/v1/health", headers: { "Origin" => "http://localhost:8082" }

    assert_response :success
    assert_equal "http://localhost:8082", response.headers["Access-Control-Allow-Origin"]
  end

  test "untrusted origin is not allowed" do
    get "/api/v1/health", headers: { "Origin" => "https://attacker.example" }

    assert_response :success
    assert_nil response.headers["Access-Control-Allow-Origin"]
  end
end
