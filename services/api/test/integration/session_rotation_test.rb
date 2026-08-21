require "test_helper"

class SessionRotationTest < ActionDispatch::IntegrationTest
  test "rotates refresh tokens and revokes the family when an old token is reused" do
    user = create_user
    original = Authentication::IssueSession.call(user:)

    post "/api/v1/auth/session/refresh", params: {
      refreshToken: original.refresh_token
    }, as: :json

    assert_response :created
    rotated_access_token = response_json.dig("session", "accessToken")
    rotated_refresh_token = response_json.dig("session", "refreshToken")
    assert_not_equal original.refresh_token, rotated_refresh_token
    assert original.session.reload.revoked_at?

    post "/api/v1/auth/session/refresh", params: {
      refreshToken: original.refresh_token
    }, as: :json
    assert_response :unauthorized
    assert_equal "auth.refresh_token_reused", response_json.dig("error", "code")

    get "/api/v1/me", headers: { "Authorization" => "Bearer #{rotated_access_token}" }
    assert_response :unauthorized
  end

  test "logout revokes every token in the device session family" do
    user = create_user
    original = Authentication::IssueSession.call(user:)
    rotated = Authentication::RefreshSession.call(refresh_token: original.refresh_token)

    delete "/api/v1/auth/session", headers: {
      "Authorization" => "Bearer #{rotated.access_token}"
    }

    assert_response :no_content
    assert_equal 0, AuthSession.where(token_family_id: original.session.token_family_id, revoked_at: nil).count
  end
end
