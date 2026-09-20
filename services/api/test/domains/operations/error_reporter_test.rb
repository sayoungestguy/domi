require "test_helper"

module Operations
  class ErrorReporterTest < ActiveSupport::TestCase
    test "logs only allowlisted structured context and never the exception message" do
      error = StandardError.new("private token domi_invite_secret")
      Current.request_id = "request-123"
      output = StringIO.new
      original_logger = Rails.logger
      Rails.logger = ActiveSupport::Logger.new(output)

      payload = ErrorReporter.capture(
        error,
        context: {
          controller: "api/v1/widgets",
          action: "show",
          method: "GET",
          path: "/api/v1/widgets/123",
          status: 500,
          params: { token: "domi_invite_secret" },
          householdName: "Private Home"
        }
      )

      assert_equal "application.error", payload.fetch(:event)
      assert_equal "StandardError", payload.fetch(:errorClass)
      assert_equal "request-123", payload.fetch(:requestId)
      assert_equal "api/v1/widgets", payload.fetch(:controller)
      assert_equal 500, payload.fetch(:status)
      refute payload.key?(:params)
      refute payload.key?(:householdName)
      assert_includes output.string, '"event":"application.error"'
      refute_includes output.string, error.message
      refute_includes output.string, "Private Home"
    ensure
      Rails.logger = original_logger if original_logger
    end
  end
end
