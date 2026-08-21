module Authentication
  class IssueSession
    Result = Data.define(:session, :access_token, :refresh_token)

    ACCESS_LIFETIME = 15.minutes
    REFRESH_LIFETIME = 30.days

    def self.call(user:, user_agent: nil, ip_address: nil, token_family_id: SecureRandom.uuid)
      access_token = Token.generate("at")
      refresh_token = Token.generate("rt")
      now = Time.current

      session = user.auth_sessions.create!(
        token_family_id:,
        access_token_digest: Token.digest(access_token),
        refresh_token_digest: Token.digest(refresh_token),
        access_expires_at: now + ACCESS_LIFETIME,
        refresh_expires_at: now + REFRESH_LIFETIME,
        user_agent: user_agent.to_s.first(512),
        ip_address:
      )

      Result.new(session:, access_token:, refresh_token:)
    end
  end
end
