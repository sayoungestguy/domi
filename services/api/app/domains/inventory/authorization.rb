module Inventory
  module Authorization
    module_function

    def ensure_member!(household:, actor:)
      return if HouseholdPolicy.new(actor, household).member?

      raise DomainError.new(
        code: "inventory.membership_required",
        message: "You no longer have access to this household.",
        status: :forbidden
      )
    end
  end
end
