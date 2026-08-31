module Privacy
  class EnforceRetentionJob < ApplicationJob
    queue_as :maintenance

    ACTIVITY_RETENTION = 90.days
    OPERATIONAL_RETENTION = 30.days

    def perform(now: Time.current)
      activity_cutoff = now - ACTIVITY_RETENTION
      operational_cutoff = now - OPERATIONAL_RETENTION
      counts = {
        activities: Activity.where("created_at < ?", activity_cutoff).delete_all,
        notifications: Notification.where("created_at < ?", activity_cutoff).delete_all,
        invitations: expired_invitations(operational_cutoff).delete_all,
        sessions: expired_sessions(operational_cutoff).delete_all
      }
      Audit.call(
        action: "privacy.retention_enforced",
        subject_type: "PrivacyAuditEvent",
        subject_id: SecureRandom.uuid,
        metadata: counts
      )
    end

    private

    def expired_invitations(cutoff)
      HouseholdInvitation.where("expires_at < ?", cutoff)
        .or(HouseholdInvitation.where.not(revoked_at: nil).where("updated_at < ?", cutoff))
        .or(HouseholdInvitation.where.not(accepted_at: nil).where("updated_at < ?", cutoff))
    end

    def expired_sessions(cutoff)
      AuthSession.where("refresh_expires_at < ?", cutoff)
        .or(AuthSession.where.not(revoked_at: nil).where("updated_at < ?", cutoff))
    end
  end
end
