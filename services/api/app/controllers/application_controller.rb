class ApplicationController < ActionController::API
  around_action :report_unexpected_errors

  private

  def report_unexpected_errors
    yield
  rescue DomainError, ActiveRecord::RecordNotFound, ActiveRecord::RecordInvalid,
      ActionController::ParameterMissing
    raise
  rescue StandardError => error
    Operations::ErrorReporter.capture(
      error,
      context: {
        controller: controller_path,
        action: action_name,
        method: request.request_method,
        path: request.path,
        status: 500
      }
    )
    raise
  end
end
