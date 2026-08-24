require "test_helper"

class ShoppingCompletionFlowTest < ActionDispatch::IntegrationTest
  test "complete loop snapshots purchases, restocks inventory, and preserves unchecked entries" do
    owner = create_user(display_name: "Maya")
    member = create_user(display_name: "Alex")
    household = Households::Create.call(user: owner, name: "Home", timezone: "Etc/UTC")
    household.household_memberships.create!(user: member, role: "member")
    owner_headers = auth_headers(owner)
    member_headers = auth_headers(member)
    milk = Inventory::CreateItem.call(
      household:, actor: owner, attributes: { name: "Milk", status: "ok" }
    ).item

    patch "/api/v1/households/#{household.id}/inventory-items/#{milk.id}/status", params: {
      status: "out"
    }, headers: owner_headers.merge("If-Match" => milk.lock_version.to_s), as: :json
    assert_response :success

    milk_entry = create_entry(
      household:, headers: member_headers, attributes: { inventoryItemId: milk.id }
    )
    bread_entry = create_entry(
      household:, headers: owner_headers, attributes: { name: "Bread", quantity: 2, note: "Wholegrain" }
    )
    remaining_entry = create_entry(
      household:, headers: owner_headers, attributes: { name: "Coffee" }
    )
    [ milk_entry, bread_entry ].each do |entry|
      check_entry(household:, headers: member_headers, entry:)
    end

    key = "finish-trip-#{SecureRandom.uuid}"
    post complete_path(household), params: { restockInventoryItems: true },
      headers: member_headers.merge("Idempotency-Key" => key), as: :json

    assert_response :created
    trip = response_json.fetch("trip")
    assert_equal 2, trip.fetch("purchasedCount")
    assert_equal 1, trip.fetch("restockedCount")
    assert_equal %w[Bread Milk], trip.fetch("items").pluck("name").sort
    assert trip.fetch("items").find { |item| item.fetch("name") == "Milk" }.fetch("restocked")
    assert_equal [ remaining_entry.fetch("id") ],
      response_json.dig("shoppingList", "entries").pluck("id")
    assert_equal "ok", milk.reload.status
    assert_equal 1, ShoppingTrip.count
    assert_equal 2, ShoppingTripItem.count
    assert_equal 3, household.shopping_list.shopping_entries.count
    assert_equal 1, household.shopping_list.shopping_entries.active.count
    assert_equal "Alex finished shopping with 2 items and restocked 1.",
      ActivitySerializer.render(household.activities.order(:created_at).last).fetch(:message)

    post complete_path(household), params: { restockInventoryItems: false },
      headers: member_headers.merge("Idempotency-Key" => key), as: :json
    assert_response :success
    assert_equal trip.fetch("id"), response_json.dig("trip", "id")
    assert response_json.dig("trip", "restockInventoryItems")
    assert_equal 1, ShoppingTrip.count
    assert_equal 1, household.activities.where(action: "shopping.trip_completed").count

    get trips_path(household), headers: owner_headers
    assert_response :success
    assert_equal [ trip.fetch("id") ], response_json.fetch("trips").pluck("id")
    assert_equal "Alex", response_json.dig("trips", 0, "completedBy", "displayName")
  end

  test "completion requires a valid idempotency key, explicit preference, and a purchase" do
    user = create_user
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")
    headers = auth_headers(user)

    post complete_path(household), params: { restockInventoryItems: false }, headers:, as: :json
    assert_response :bad_request
    assert_equal "shopping.idempotency_key_required", response_json.dig("error", "code")

    post complete_path(household), params: {},
      headers: headers.merge("Idempotency-Key" => SecureRandom.uuid), as: :json
    assert_response :bad_request
    assert_equal "request.invalid", response_json.dig("error", "code")

    create_entry(household:, headers:, attributes: { name: "Coffee" })
    post complete_path(household), params: { restockInventoryItems: false },
      headers: headers.merge("Idempotency-Key" => SecureRandom.uuid), as: :json
    assert_response :unprocessable_entity
    assert_equal "shopping.no_purchased_entries", response_json.dig("error", "code")
    assert_empty household.shopping_trips
  end

  test "completion can preserve linked inventory status" do
    user = create_user
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")
    headers = auth_headers(user)
    item = Inventory::CreateItem.call(
      household:, actor: user, attributes: { name: "Rice", status: "out" }
    ).item
    entry = create_entry(
      household:, headers:, attributes: { inventoryItemId: item.id }
    )
    check_entry(household:, headers:, entry:)

    post complete_path(household), params: { restockInventoryItems: false },
      headers: headers.merge("Idempotency-Key" => SecureRandom.uuid), as: :json

    assert_response :created
    assert_not response_json.dig("trip", "restockInventoryItems")
    assert_equal 0, response_json.dig("trip", "restockedCount")
    assert_not response_json.dig("trip", "items", 0, "restocked")
    assert_equal "out", item.reload.status
  end

  test "completion rolls back trip, list, activity, and restocking after a failure" do
    user = create_user
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")
    item = Inventory::CreateItem.call(
      household:, actor: user, attributes: { name: "Soap", status: "out" }
    ).item
    entry = Shopping::CreateEntry.call(
      household:,
      actor: user,
      attributes: { inventory_item_id: item.id },
      idempotency_key: SecureRandom.uuid
    ).entry
    Shopping::SetPurchased.call(
      household:, actor: user, entry:, purchased: true, expected_version: entry.lock_version
    )

    failure = Class.new do
      def self.call(**)
        raise "activity write failed"
      end
    end
    assert_raises(RuntimeError) do
      Shopping::CompleteTrip.call(
        household:,
        actor: user,
        idempotency_key: SecureRandom.uuid,
        restock_inventory_items: true,
        activity_recorder: failure
      )
    end

    assert_empty household.shopping_trips.reload
    assert_equal "out", item.reload.status
    assert entry.reload.purchased
    assert_nil entry.removed_at
    assert_empty ShoppingTripItem.all
  end

  test "trip history is household scoped and immutable" do
    owner = create_user
    outsider = create_user
    household = Households::Create.call(user: owner, name: "Private", timezone: "Etc/UTC")
    headers = auth_headers(owner)
    entry = create_entry(household:, headers:, attributes: { name: "Rice" })
    check_entry(household:, headers:, entry:)
    post complete_path(household), params: { restockInventoryItems: false },
      headers: headers.merge("Idempotency-Key" => SecureRandom.uuid), as: :json
    assert_response :created

    get trips_path(household), headers: auth_headers(outsider)
    assert_response :not_found
    assert_equal "resource.not_found", response_json.dig("error", "code")

    trip = household.shopping_trips.first
    item = trip.shopping_trip_items.first
    assert_raises(ActiveRecord::ReadOnlyRecord) { trip.update!(purchased_count: 2) }
    assert_raises(ActiveRecord::ReadOnlyRecord) { item.update!(name: "Changed") }
  end

  private

  def list_path(household)
    "/api/v1/households/#{household.id}/shopping-list"
  end

  def entries_path(household)
    "#{list_path(household)}/entries"
  end

  def complete_path(household)
    "#{list_path(household)}/complete"
  end

  def trips_path(household)
    "/api/v1/households/#{household.id}/shopping-trips"
  end

  def create_entry(household:, headers:, attributes:)
    post entries_path(household), params: { shoppingEntry: attributes },
      headers: headers.merge("Idempotency-Key" => SecureRandom.uuid), as: :json
    assert_response :created
    response_json.fetch("entry")
  end

  def check_entry(household:, headers:, entry:)
    patch "#{entries_path(household)}/#{entry.fetch('id')}/purchased", params: {
      purchased: true
    }, headers: headers.merge("If-Match" => entry.fetch("version").to_s), as: :json
    assert_response :success
  end
end
