require "test_helper"

class AccountsFlowTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  test "registers an unverified account without exposing its secret" do
    assert_enqueued_emails 1 do
      post "/api/v1/auth/register", params: {
        account: {
          email: "New.Member@Example.com ",
          displayName: " New Member ",
          password: ApiTestHelpers::PASSWORD,
          passwordConfirmation: ApiTestHelpers::PASSWORD
        }
      }, as: :json
    end

    assert_response :created
    assert_equal true, response_json.fetch("verificationRequired")
    assert_equal "new.member@example.com", response_json.dig("user", "email")
    assert_nil response_json["token"]
    assert_not User.find_by!(email: "new.member@example.com").email_verified?
  end

  test "duplicate registration has a stable conflict response" do
    create_user(email: "member@example.com")

    post "/api/v1/auth/register", params: {
      account: {
        email: "MEMBER@example.com",
        displayName: "Another Member",
        password: ApiTestHelpers::PASSWORD,
        passwordConfirmation: ApiTestHelpers::PASSWORD
      }
    }, as: :json

    assert_response :conflict
    assert_equal "account.email_taken", response_json.dig("error", "code")
  end

  test "verifies an email and issues a mobile session" do
    user = create_user(verified: false)
    token = user.issue_email_verification_token!

    post "/api/v1/auth/email-verification", params: { token: }, as: :json

    assert_response :success
    assert response_json.dig("session", "accessToken").start_with?("domi_at_")
    assert response_json.dig("session", "refreshToken").start_with?("domi_rt_")
    assert user.reload.email_verified?

    post "/api/v1/auth/email-verification", params: { token: }, as: :json
    assert_response :unprocessable_entity
    assert_equal "account.invalid_verification_token", response_json.dig("error", "code")
  end

  test "requires verification and uses a generic invalid-credentials response" do
    user = create_user(verified: false)

    post "/api/v1/auth/session", params: {
      session: { email: user.email, password: ApiTestHelpers::PASSWORD }
    }, as: :json
    assert_response :forbidden
    assert_equal "account.email_not_verified", response_json.dig("error", "code")

    post "/api/v1/auth/session", params: {
      session: { email: "missing@example.com", password: "incorrect password" }
    }, as: :json
    assert_response :unauthorized
    assert_equal "auth.invalid_credentials", response_json.dig("error", "code")
  end

  test "password reset is non-enumerating and revokes existing sessions" do
    user = create_user
    old_session = Authentication::IssueSession.call(user:).session
    token = user.issue_password_reset_token!

    post "/api/v1/auth/password-reset", params: { email: "missing@example.com" }, as: :json
    assert_response :accepted

    patch "/api/v1/auth/password-reset", params: {
      token:,
      password: "a new correct horse password",
      passwordConfirmation: "a new correct horse password"
    }, as: :json

    assert_response :success
    assert old_session.reload.revoked_at?
    assert user.reload.authenticate("a new correct horse password")
    assert response_json.dig("session", "accessToken").present?
  end

  test "shows and updates the authenticated user" do
    user = create_user
    headers = auth_headers(user)

    get "/api/v1/me", headers: headers
    assert_response :success
    assert_equal user.id, response_json.dig("user", "id")

    patch "/api/v1/me", params: { user: { displayName: "Updated Name" } },
      headers: headers, as: :json
    assert_response :success
    assert_equal "Updated Name", response_json.dig("user", "displayName")
  end
end
