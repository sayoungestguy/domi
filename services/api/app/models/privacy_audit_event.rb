class PrivacyAuditEvent < ApplicationRecord
  ACTIONS = %w[
    privacy.account_exported
    privacy.household_exported
    privacy.account_deleted
    privacy.household_deleted
    privacy.retention_enforced
  ].freeze

  validates :action, inclusion: { in: ACTIONS }
  validates :subject_type, :subject_id, presence: true

  def readonly?
    persisted?
  end
end
