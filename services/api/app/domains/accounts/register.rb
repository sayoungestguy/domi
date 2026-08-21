module Accounts
  class Register
    Result = Data.define(:user, :verification_token)

    def self.call(email:, display_name:, password:, password_confirmation:)
      user = User.new(email:, display_name:, password:, password_confirmation:)

      User.transaction do
        user.save!
        token = user.issue_email_verification_token!
        UserMailer.email_verification(user, token).deliver_later
        Result.new(user:, verification_token: token)
      end
    rescue ActiveRecord::RecordInvalid => error
      raise unless error.record.equal?(user) && user.errors.of_kind?(:email, :taken)

      email_taken!
    rescue ActiveRecord::RecordNotUnique
      email_taken!
    end

    def self.email_taken!
      raise DomainError.new(
        code: "account.email_taken",
        message: "An account already exists for that email address.",
        status: :conflict
      )
    end
    private_class_method :email_taken!
  end
end
