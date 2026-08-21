module Accounts
  class VerifyEmail
    TOKEN_LIFETIME = 24.hours

    def self.call(token:)
      digest = Authentication::Token.digest(token)

      User.transaction do
        user = User.lock.find_by(email_verification_token_digest: digest)
        invalid_token! unless user
        invalid_token! if user.email_verification_sent_at.blank? || user.email_verification_sent_at < TOKEN_LIFETIME.ago

        user.update!(
          email_verified_at: Time.current,
          email_verification_token_digest: nil,
          email_verification_sent_at: nil
        )
        user
      end
    end

    def self.invalid_token!
      raise DomainError.new(
        code: "account.invalid_verification_token",
        message: "The verification link is invalid or has expired.",
        status: :unprocessable_entity
      )
    end
    private_class_method :invalid_token!
  end
end
