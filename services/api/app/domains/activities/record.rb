module Activities
  class Record
    def self.call(household:, actor:, action:, subject:, metadata: {})
      Activity.create!(
        household:,
        actor:,
        action:,
        subject_type: subject.class.name,
        subject_id: subject.id,
        metadata:
      )
    end
  end
end
