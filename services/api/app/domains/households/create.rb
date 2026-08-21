module Households
  class Create
    def self.call(user:, name:, timezone:)
      Household.transaction do
        household = Household.create!(name:, timezone:)
        household.household_memberships.create!(user:, role: "owner")
        household
      end
    end
  end
end
