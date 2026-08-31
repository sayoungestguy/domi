module Privacy
  class ExportAccount
    def self.call(user:)
      payload = {
        schemaVersion: 1,
        exportedAt: Time.current.iso8601,
        account: UserSerializer.render(user),
        memberships: user.household_memberships.includes(:household).map do |membership|
          {
            householdId: membership.household_id,
            householdName: membership.household.name,
            role: membership.role,
            joinedAt: membership.created_at.iso8601
          }
        end,
        authoredActivities: user.activities.order(:created_at).map { |activity| ActivitySerializer.render(activity) },
        notifications: user.received_notifications.includes(:actor).newest_first.map do |notification|
          NotificationSerializer.render(notification)
        end,
        notificationPreferences: user.notification_preferences.map do |preference|
          {
            householdId: preference.household_id,
            preferences: NotificationPreferenceSerializer.render(preference)
          }
        end
      }
      Audit.call(
        action: "privacy.account_exported", actor: user,
        subject_type: "User", subject_id: user.id
      )
      payload
    end
  end
end
