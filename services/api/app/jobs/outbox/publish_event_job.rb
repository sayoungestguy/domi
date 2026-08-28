module Outbox
  class PublishEventJob < ApplicationJob
    queue_as :realtime

    retry_on StandardError, wait: :polynomially_longer, attempts: 5
    discard_on ActiveRecord::RecordNotFound

    def perform(event_id)
      Publish.call(event: OutboxEvent.find(event_id))
    end
  end
end
