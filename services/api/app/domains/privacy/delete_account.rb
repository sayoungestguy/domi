module Privacy
  class DeleteAccount
    def self.call(user:)
      User.transaction do
        user.lock!
        owned = user.household_memberships.includes(:household).select(&:owner?)
        owned_households!(owned) if owned.any?

        Audit.call(
          action: "privacy.account_deleted", actor: user,
          subject_type: "User", subject_id: user.id,
          metadata: { membershipCount: user.household_memberships.count }
        )
        AuthSession.where(user:).delete_all
        Notification.where(recipient: user).delete_all
        NotificationPreference.where(user:).delete_all
        HouseholdMembership.where(user:).delete_all
        user.sent_notifications.update_all(
          body: "A deleted member changed this household.", updated_at: Time.current
        )
        random_password = SecureRandom.base64(48)
        user.update!(
          email: "deleted-#{SecureRandom.uuid}@example.invalid",
          display_name: "Deleted member",
          password: random_password,
          password_confirmation: random_password,
          email_verified_at: nil,
          email_verification_token_digest: nil,
          email_verification_sent_at: nil,
          password_reset_token_digest: nil,
          password_reset_sent_at: nil,
          deleted_at: Time.current
        )
      end
    end

    def self.owned_households!(memberships)
      raise DomainError.new(
        code: "privacy.owned_households",
        message: "Transfer ownership or delete your owned households first.",
        status: :unprocessable_entity,
        details: {
          ownedHouseholds: memberships.map do |membership|
            { id: membership.household_id, name: membership.household.name }
          end
        }
      )
    end
    private_class_method :owned_households!
  end
end
