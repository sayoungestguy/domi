class AuthSession < ApplicationRecord
  belongs_to :user

  validates :access_token_digest, :refresh_token_digest, :token_family_id,
    :access_expires_at, :refresh_expires_at, presence: true

  scope :active, -> { where(revoked_at: nil) }

  def active_access_token?
    revoked_at.nil? && access_expires_at.future?
  end

  def active_refresh_token?
    revoked_at.nil? && refresh_expires_at.future?
  end
end
