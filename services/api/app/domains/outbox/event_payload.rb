module Outbox
  class EventPayload
    SCHEMA_VERSION = 1

    def self.render(event)
      {
        type: event.event_type,
        schemaVersion: SCHEMA_VERSION,
        eventId: event.id,
        householdId: event.household_id,
        sequence: event.sequence,
        occurredAt: event.occurred_at.iso8601,
        resource: event.payload.fetch("resource"),
        action: event.payload.fetch("action"),
        subject: {
          type: event.subject_type,
          id: event.subject_id,
          version: event.payload["resourceVersion"]
        }
      }
    end
  end
end
