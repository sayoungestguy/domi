module Operations
  class ErrorReporter
    ALLOWED_CONTEXT_KEYS = %i[controller action method path status].freeze

    def self.capture(error, context: {})
      payload = {
        event: "application.error",
        errorClass: error.class.name,
        requestId: Current.request_id,
        release: ENV.fetch("APP_VERSION", "development"),
        environment: Rails.env
      }.merge(context.symbolize_keys.slice(*ALLOWED_CONTEXT_KEYS)).compact

      Rails.logger.error(payload.to_json)
      payload
    end
  end
end
