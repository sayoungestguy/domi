module Accounts
  class RequestPasswordReset
    def self.call(email:)
      user = User.find_by(email: email.to_s.strip.downcase)
      return unless user&.email_verified?

      token = user.issue_password_reset_token!
      UserMailer.password_reset(user, token).deliver_later
    end
  end
end
