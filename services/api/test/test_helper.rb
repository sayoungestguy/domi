ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ApiTestHelpers
  PASSWORD = "correct horse battery staple"

  def create_user(email: nil, display_name: "Test Member", verified: true)
    User.create!(
      email: email || "member-#{SecureRandom.hex(6)}@example.com",
      display_name:,
      password: PASSWORD,
      password_confirmation: PASSWORD,
      email_verified_at: verified ? Time.current : nil
    )
  end

  def auth_headers(user)
    result = Authentication::IssueSession.call(user:, user_agent: "test", ip_address: "127.0.0.1")
    { "Authorization" => "Bearer #{result.access_token}" }
  end

  def response_json
    response.parsed_body
  end
end

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all
    include ApiTestHelpers

    teardown do
      Current.reset
    end
  end
end
