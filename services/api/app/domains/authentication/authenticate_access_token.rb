module Authentication
  class AuthenticateAccessToken
    def self.call(token)
      return if token.blank?

      session = AuthSession.active.includes(:user).find_by(access_token_digest: Token.digest(token))
      return unless session&.active_access_token?

      session
    end
  end
end
