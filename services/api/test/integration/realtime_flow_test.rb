require "test_helper"

class RealtimeFlowTest < ActionDispatch::IntegrationTest
  test "domain mutation commits an ordered event and publisher is duplicate safe" do
    user = create_user
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")

    assert_difference [ "Activity.count", "OutboxEvent.count" ], 1 do
      Inventory::CreateItem.call(
        household:, actor: user, attributes: { name: "Milk", status: "ok" }
      )
    end

    event = household.outbox_events.first
    assert_equal 1, event.sequence
    assert_equal 1, household.reload.realtime_sequence
    assert_equal "inventory.item_created", event.payload.fetch("action")
    assert_equal "inventory", event.payload.fetch("resource")

    broadcaster = recording_broadcaster
    2.times { Outbox::Publish.call(event:, broadcaster:) }

    assert_equal 1, broadcaster.messages.length
    payload = broadcaster.messages.first.fetch(:payload)
    assert_equal event.id, payload.fetch(:eventId)
    assert_equal household.id, payload.fetch(:householdId)
    assert_equal 1, payload.fetch(:sequence)
    assert_equal "InventoryItem", payload.dig(:subject, :type)
    assert event.reload.published?
    assert_equal 1, event.attempts
  end

  test "publish failure remains durable and can be retried" do
    user = create_user
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")
    Inventory::CreateItem.call(
      household:, actor: user, attributes: { name: "Soap", status: "out" }
    )
    event = household.outbox_events.first
    failing_broadcaster = Class.new do
      def self.broadcast_to(*)
        raise IOError, "cable unavailable"
      end
    end

    assert_raises(IOError) { Outbox::Publish.call(event:, broadcaster: failing_broadcaster) }
    assert_nil event.reload.published_at
    assert_equal 1, event.attempts
    assert_equal "IOError", event.last_error
    assert event.available_at.future?

    broadcaster = recording_broadcaster
    Outbox::Publish.call(event:, broadcaster:)
    assert event.reload.published?
    assert_equal 2, event.attempts
    assert_equal 1, broadcaster.messages.length
  end

  test "activity and outbox roll back together" do
    user = create_user
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")
    item = household.inventory_items.create!(
      name: "Rice", status: "ok", created_by: user, updated_by: user
    )

    assert_no_difference [ "Activity.count", "OutboxEvent.count" ] do
      Activity.transaction do
        Activities::Record.call(
          household:, actor: user, action: "inventory.item_created", subject: item,
          metadata: { itemName: item.name }
        )
        raise ActiveRecord::Rollback
      end
    end
    assert_equal 0, household.reload.realtime_sequence
  end

  test "realtime sequence is household scoped and authorized" do
    owner = create_user
    outsider = create_user
    household = Households::Create.call(user: owner, name: "Home", timezone: "Etc/UTC")
    Inventory::CreateItem.call(
      household:, actor: owner, attributes: { name: "Coffee", status: "ok" }
    )

    get realtime_state_path(household), headers: auth_headers(owner)
    assert_response :success
    assert_equal household.id, response_json.dig("realtimeState", "householdId")
    assert_equal 1, response_json.dig("realtimeState", "currentSequence")

    get realtime_state_path(household), headers: auth_headers(outsider)
    assert_response :not_found
  end

  test "pending dispatcher enqueues only due unpublished events" do
    user = create_user
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")
    Inventory::CreateItem.call(
      household:, actor: user, attributes: { name: "Bread", status: "ok" }
    )
    event = household.outbox_events.first
    event.update!(available_at: 1.minute.ago)
    future_event = household.outbox_events.create!(
      sequence: 2,
      event_type: "household.changed",
      subject_type: "InventoryItem",
      subject_id: SecureRandom.uuid,
      payload: { action: "inventory.item_updated", resource: "inventory" },
      occurred_at: Time.current,
      available_at: 1.hour.from_now
    )

    clear_enqueued_jobs
    assert_enqueued_with(job: Outbox::PublishEventJob, args: [ event.id ]) do
      Outbox::DispatchPendingJob.perform_now
    end
    assert_enqueued_jobs 1
    assert_not_includes enqueued_jobs.map { |job| job.fetch(:args) }, [ future_event.id ]
  end

  private

  def realtime_state_path(household)
    "/api/v1/households/#{household.id}/realtime-state"
  end

  def recording_broadcaster
    Class.new do
      class << self
        attr_accessor :messages

        def broadcast_to(household, payload)
          self.messages ||= []
          messages << { household:, payload: }
        end
      end
    end.tap { |broadcaster| broadcaster.messages = [] }
  end
end
