module HouseholdSerializer
  module_function

  def render(household, membership: nil)
    membership ||= household.household_memberships.find_by(user: Current.user)
    {
      id: household.id,
      name: household.name,
      timezone: household.timezone,
      role: membership&.role,
      version: household.lock_version,
      createdAt: household.created_at.iso8601
    }
  end
end
