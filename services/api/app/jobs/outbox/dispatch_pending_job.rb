module Outbox
  class DispatchPendingJob < ApplicationJob
    queue_as :realtime

    BATCH_SIZE = 100

    def perform
      OutboxEvent.pending.order(:created_at, :id).limit(BATCH_SIZE).pluck(:id).each do |event_id|
        PublishEventJob.perform_later(event_id)
      end
    end
  end
end
