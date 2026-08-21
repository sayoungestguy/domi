class HouseholdInvitation < ApplicationRecord
  belongs_to :household
  belongs_to :created_by, class_name: "User"
  belongs_to :accepted_by, class_name: "User", optional: true

  validates :token_digest, :expires_at, presence: true

  scope :available, -> { where(revoked_at: nil, accepted_at: nil).where("expires_at > ?", Time.current) }

  def available?
    revoked_at.nil? && accepted_at.nil? && expires_at.future?
  end
end
