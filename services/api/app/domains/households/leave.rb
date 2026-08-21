module Households
  class Leave
    def self.call(household:, user:)
      Household.transaction do
        # Ownership transfer uses the same household lock. Serializing both
        # operations prevents a member from becoming owner between this check
        # and deletion, which would otherwise leave the household ownerless.
        household.lock!
        membership = household.household_memberships.lock.find_by!(user:)
        if membership.owner?
          raise DomainError.new(
            code: "household.owner_cannot_leave",
            message: "Transfer ownership before leaving the household.",
            status: :unprocessable_entity
          )
        end

        membership.destroy!
      end
    end
  end
end
