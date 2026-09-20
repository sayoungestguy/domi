module Privacy
  class Audit
    def self.call(action:, subject_type:, subject_id:, actor: nil, metadata: {})
      PrivacyAuditEvent.create!(
        action:,
        actor_id: actor&.id,
        subject_type:,
        subject_id:,
        request_id: Current.request_id,
        metadata:
      )
    end
  end
end
