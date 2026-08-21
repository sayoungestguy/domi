module Households
  class AcceptInvitation
    def self.call(user:, token:)
      digest = Authentication::Token.digest(token)

      HouseholdInvitation.transaction do
        invitation = HouseholdInvitation.lock.includes(:household).find_by(token_digest: digest)
        invalid_invitation! unless invitation&.available?

        if HouseholdMembership.exists?(household: invitation.household, user:)
          raise DomainError.new(
            code: "household.already_member",
            message: "You already belong to this household.",
            status: :conflict
          )
        end

        membership = invitation.household.household_memberships.create!(user:, role: "member")
        invitation.update!(accepted_at: Time.current, accepted_by: user)
        membership
      end
    rescue ActiveRecord::RecordNotUnique
      raise DomainError.new(
        code: "household.already_member",
        message: "You already belong to this household.",
        status: :conflict
      )
    end

    def self.invalid_invitation!
      raise DomainError.new(
        code: "household.invalid_invitation",
        message: "The invitation is invalid, expired, revoked, or already used.",
        status: :unprocessable_entity
      )
    end
    private_class_method :invalid_invitation!
  end
end
