class HouseholdMembership < ApplicationRecord
  ROLES = %w[owner member].freeze

  belongs_to :household
  belongs_to :user

  validates :role, inclusion: { in: ROLES }
  validates :user_id, uniqueness: { scope: :household_id }

  def owner?
    role == "owner"
  end
end
