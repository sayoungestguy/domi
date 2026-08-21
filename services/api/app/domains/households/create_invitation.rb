module Households
  class CreateInvitation
    Result = Data.define(:invitation, :token)
    LIFETIME = 7.days

    def self.call(household:, actor:, expires_in: LIFETIME)
      authorize_owner!(household:, actor:)
      token = Authentication::Token.generate("invite")
      invitation = household.household_invitations.create!(
        created_by: actor,
        token_digest: Authentication::Token.digest(token),
        expires_at: Time.current + expires_in
      )
      Result.new(invitation:, token:)
    end

    def self.authorize_owner!(household:, actor:)
      membership = household.household_memberships.find_by(user: actor)
      return if membership&.owner?

      raise DomainError.new(
        code: "household.owner_required",
        message: "Only the household owner can perform this action.",
        status: :forbidden
      )
    end
    private_class_method :authorize_owner!
  end
end
