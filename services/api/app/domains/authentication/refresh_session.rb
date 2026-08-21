module Authentication
  class RefreshSession
    def self.call(refresh_token:, user_agent: nil, ip_address: nil)
      digest = Token.digest(refresh_token)

      outcome = AuthSession.transaction do
        session = AuthSession.lock.find_by(refresh_token_digest: digest)
        invalid_refresh_token! unless session

        if session.revoked_at?
          AuthSession.where(token_family_id: session.token_family_id, revoked_at: nil)
            .update_all(revoked_at: Time.current, updated_at: Time.current)
          :reused
        elsif !session.refresh_expires_at.future?
          session.update!(revoked_at: Time.current)
          :expired
        else
          session.update!(revoked_at: Time.current, last_used_at: Time.current)
          IssueSession.call(
            user: session.user,
            user_agent:,
            ip_address:,
            token_family_id: session.token_family_id
          )
        end
      end

      if outcome == :reused
        raise DomainError.new(
          code: "auth.refresh_token_reused",
          message: "This session has been revoked. Sign in again.",
          status: :unauthorized
        )
      end

      invalid_refresh_token!("The refresh token has expired. Sign in again.") if outcome == :expired
      outcome
    end

    def self.invalid_refresh_token!(message = "The refresh token is invalid.")
      raise DomainError.new(code: "auth.invalid_refresh_token", message:, status: :unauthorized)
    end
    private_class_method :invalid_refresh_token!
  end
end
