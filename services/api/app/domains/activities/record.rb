module Activities
  class Record
    def self.call(household:, actor:, action:, subject:, metadata: {})
      Activity.transaction do
        activity = Activity.create!(
          household:,
          actor:,
          action:,
          subject_type: subject.class.name,
          subject_id: subject.id,
          metadata:
        )
        Outbox::Record.call(household:, action:, subject:, occurred_at: activity.created_at)
        activity
      end
    end
  end
end
