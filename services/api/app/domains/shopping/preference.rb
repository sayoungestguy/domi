module Shopping
  class Preference
    def self.call(household:)
      household.household_preference || HouseholdPreference.create_or_find_by!(household:)
    end
  end
end
