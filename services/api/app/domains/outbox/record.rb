module Outbox
  class Record
    def self.call(household:, action:, subject:, occurred_at: Time.current)
      household.lock!
      sequence = household.realtime_sequence + 1
      household.update_column(:realtime_sequence, sequence)
      household.outbox_events.create!(
        sequence:,
        event_type: "household.changed",
        subject_type: subject.class.name,
        subject_id: subject.id,
        payload: {
          action:,
          resource: action.to_s.split(".").first,
          resourceVersion: subject.respond_to?(:lock_version) ? subject.lock_version : nil
        },
        occurred_at:,
        available_at: Time.current
      )
    end
  end
end
