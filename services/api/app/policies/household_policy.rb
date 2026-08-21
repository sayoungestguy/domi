class HouseholdPolicy
  def initialize(user, household)
    @membership = household.household_memberships.find_by(user:)
  end

  def member?
    @membership.present?
  end

  def owner?
    @membership&.owner? || false
  end

  def membership
    @membership if member?
  end
end
