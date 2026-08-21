module Accounts
  class ResetPassword
    TOKEN_LIFETIME = 1.hour

    def self.call(token:, password:, password_confirmation:)
      digest = Authentication::Token.digest(token)

      User.transaction do
        user = User.lock.find_by(password_reset_token_digest: digest)
        invalid_token! unless user
        invalid_token! if user.password_reset_sent_at.blank? || user.password_reset_sent_at < TOKEN_LIFETIME.ago

        user.password = password
        user.password_confirmation = password_confirmation
        user.password_reset_token_digest = nil
        user.password_reset_sent_at = nil
        user.save!
        user.auth_sessions.active.update_all(revoked_at: Time.current, updated_at: Time.current)
        user
      end
    end

    def self.invalid_token!
      raise DomainError.new(
        code: "account.invalid_password_reset_token",
        message: "The password reset link is invalid or has expired.",
        status: :unprocessable_entity
      )
    end
    private_class_method :invalid_token!
  end
end
