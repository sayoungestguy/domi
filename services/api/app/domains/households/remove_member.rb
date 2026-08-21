module Households
  class RemoveMember
    def self.call(household:, actor:, target_membership:)
      Household.transaction do
        # Keep the authorization decision and deletion ordered with ownership
        # transfer so the target cannot become owner between them.
        household.lock!
        actor_membership = household.household_memberships.lock.find_by(user: actor)
        owner_required! unless actor_membership&.owner?

        target = household.household_memberships.lock.find(target_membership.id)
        if target.owner?
          raise DomainError.new(
            code: "household.owner_cannot_be_removed",
            message: "Transfer ownership before removing the owner.",
            status: :unprocessable_entity
          )
        end

        target.destroy!
      end
    end

    def self.owner_required!
      raise DomainError.new(
        code: "household.owner_required",
        message: "Only the household owner can remove members.",
        status: :forbidden
      )
    end
    private_class_method :owner_required!
  end
end
