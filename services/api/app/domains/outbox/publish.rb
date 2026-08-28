module Outbox
  class Publish
    MAX_BACKOFF = 5.minutes

    def self.call(event:, broadcaster: HouseholdChannel)
      event.with_lock do
        return event if event.published?

        broadcaster.broadcast_to(event.household, EventPayload.render(event))

        event.update!(
          attempts: event.attempts + 1,
          published_at: Time.current,
          last_error: nil
        )
        event
      end
    rescue StandardError => error
      record_failure(event, error)
      raise
    end

    def self.record_failure(event, error)
      event.reload
      attempts = event.attempts + 1
      delay = [ 2**attempts, MAX_BACKOFF.to_i ].min.seconds
      event.update!(
        attempts:,
        available_at: Time.current + delay,
        last_error: error.class.name[0, 255]
      )
    end
    private_class_method :record_failure
  end
end
