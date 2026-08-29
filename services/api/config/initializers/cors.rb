local_origins = [ %r{\Ahttps?://(?:localhost|127\.0\.0\.1)(?::\d+)?\z} ]
configured_origins = ENV.fetch("CORS_ALLOWED_ORIGINS", "")
                        .split(",")
                        .map(&:strip)
                        .reject(&:empty?)
allowed_origins = Rails.env.local? ? local_origins : configured_origins

if allowed_origins.any?
  Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
      origins(*allowed_origins)
      resource "/api/*",
        headers: :any,
        methods: %i[get post patch delete options head],
        max_age: 600
    end
  end
end
