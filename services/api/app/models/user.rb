class User < ApplicationRecord
  EMAIL_PATTERN = URI::MailTo::EMAIL_REGEXP

  has_secure_password

  has_many :auth_sessions, dependent: :destroy
  has_many :household_memberships, dependent: :restrict_with_error
  has_many :households, through: :household_memberships
  has_many :activities, foreign_key: :actor_id, dependent: :restrict_with_error, inverse_of: :actor
  has_many :received_notifications, class_name: "Notification", foreign_key: :recipient_id,
    dependent: :delete_all, inverse_of: :recipient
  has_many :sent_notifications, class_name: "Notification", foreign_key: :actor_id,
    dependent: :restrict_with_error, inverse_of: :actor
  has_many :notification_preferences, dependent: :delete_all
  has_many :added_shopping_entries, class_name: "ShoppingEntry", foreign_key: :added_by_id,
    dependent: :restrict_with_error, inverse_of: :added_by
  has_many :updated_shopping_entries, class_name: "ShoppingEntry", foreign_key: :updated_by_id,
    dependent: :restrict_with_error, inverse_of: :updated_by

  normalizes :email, with: ->(email) { email.strip.downcase }
  normalizes :display_name, with: ->(name) { name.strip }

  validates :email, presence: true, format: { with: EMAIL_PATTERN }, length: { maximum: 254 }, uniqueness: true
  validates :display_name, presence: true, length: { maximum: 80 }
  validates :password, length: { minimum: 12, maximum: 72 }, if: -> { password.present? }

  def email_verified?
    email_verified_at.present?
  end

  def issue_email_verification_token!
    token = Authentication::Token.generate("evt")
    update!(
      email_verification_token_digest: Authentication::Token.digest(token),
      email_verification_sent_at: Time.current
    )
    token
  end

  def issue_password_reset_token!
    token = Authentication::Token.generate("prt")
    update!(
      password_reset_token_digest: Authentication::Token.digest(token),
      password_reset_sent_at: Time.current
    )
    token
  end
end
