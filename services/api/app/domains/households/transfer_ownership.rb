module Households
  class TransferOwnership
    def self.call(household:, actor:, target_membership:)
      Household.transaction do
        household.lock!
        actor_membership = household.household_memberships.lock.find_by(user: actor)
        owner_required! unless actor_membership&.owner?

        target = household.household_memberships.lock.find(target_membership.id)
        if target.id == actor_membership.id
          raise DomainError.new(
            code: "household.already_owner",
            message: "That member already owns the household.",
            status: :unprocessable_entity
          )
        end

        actor_membership.update!(role: "member")
        target.update!(role: "owner")
        target
      end
    end

    def self.owner_required!
      raise DomainError.new(
        code: "household.owner_required",
        message: "Only the household owner can transfer ownership.",
        status: :forbidden
      )
    end
    private_class_method :owner_required!
  end
end
