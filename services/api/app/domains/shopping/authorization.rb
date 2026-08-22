module Shopping
  module Authorization
    module_function

    def ensure_member!(household:, actor:)
      return if HouseholdPolicy.new(actor, household).member?

      raise DomainError.new(
        code: "shopping.membership_required",
        message: "You no longer have access to this household.",
        status: :forbidden
      )
    end
  end
end
