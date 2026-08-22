require "test_helper"

class ShoppingFlowTest < ActionDispatch::IntegrationTest
  test "members share one list and retried creates are idempotent" do
    owner = create_user(display_name: "Maya")
    member = create_user(display_name: "Alex")
    household = Households::Create.call(user: owner, name: "Home", timezone: "Etc/UTC")
    household.household_memberships.create!(user: member, role: "member")
    key = "add-milk-#{SecureRandom.uuid}"

    post entries_path(household), params: { shoppingEntry: { name: "Milk" } },
      headers: auth_headers(owner), as: :json
    assert_response :bad_request
    assert_equal "shopping.idempotency_key_required", response_json.dig("error", "code")

    2.times do
      post entries_path(household), params: {
        shoppingEntry: { name: "Milk", quantity: 2, note: "Oat milk" }
      }, headers: auth_headers(owner).merge("Idempotency-Key" => key), as: :json
      assert_includes [ 200, 201 ], response.status
    end

    get list_path(household), headers: auth_headers(member)
    assert_response :success
    assert_equal 1, response_json.dig("shoppingList", "remainingCount")
    assert_equal [ "Milk" ], response_json.dig("shoppingList", "entries").pluck("name")
    assert_equal 1, household.shopping_list.shopping_entries.count
    assert_equal "Maya added Milk to shopping.", ActivitySerializer.render(household.activities.last).fetch(:message)
  end

  test "linked inventory entries are duplicate safe and OUT returns a manual prompt" do
    user = create_user
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")
    headers = auth_headers(user)
    item = Inventory::CreateItem.call(
      household:, actor: user, attributes: { name: "Rice", status: "ok" }
    ).item

    patch "/api/v1/households/#{household.id}/inventory-items/#{item.id}/status", params: {
      status: "out"
    }, headers: headers.merge("If-Match" => item.lock_version.to_s), as: :json
    assert_response :success
    assert response_json.dig("shopping", "shouldPrompt")

    2.times do
      post entries_path(household), params: {
        shoppingEntry: { inventoryItemId: item.id }
      }, headers: headers.merge("Idempotency-Key" => SecureRandom.uuid), as: :json
      assert_includes [ 200, 201 ], response.status
    end

    assert_equal 1, household.shopping_list.shopping_entries.active.where(inventory_item: item).count
  end

  test "automatic OUT addition honors the household preference" do
    user = create_user
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")
    headers = auth_headers(user)
    item = Inventory::CreateItem.call(
      household:, actor: user, attributes: { name: "Soap", status: "ok" }
    ).item

    patch "/api/v1/households/#{household.id}/shopping-preference", params: {
      autoAddOutItems: true
    }, headers:, as: :json
    assert_response :success

    patch "/api/v1/households/#{household.id}/inventory-items/#{item.id}/status", params: {
      status: "out"
    }, headers: headers.merge("If-Match" => item.lock_version.to_s), as: :json
    assert_response :success
    assert response_json.dig("shopping", "automaticallyAdded")
    assert_not response_json.dig("shopping", "shouldPrompt")
    assert_equal item.id, response_json.dig("shopping", "entry", "inventoryItemId")
  end

  test "purchased state is explicit and stale concurrent edits conflict" do
    user = create_user(display_name: "Maya")
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")
    headers = auth_headers(user)
    entry = create_entry(household:, headers:, name: "Bread")

    patch "#{entries_path(household)}/#{entry.fetch('id')}/purchased", params: {
      purchased: true
    }, headers: headers.merge("If-Match" => entry.fetch("version").to_s), as: :json
    assert_response :success
    assert response_json.dig("entry", "purchased")
    current_version = response_json.dig("entry", "version")

    patch "#{entries_path(household)}/#{entry.fetch('id')}", params: {
      shoppingEntry: { note: "Wholegrain" }
    }, headers: headers.merge("If-Match" => entry.fetch("version").to_s), as: :json
    assert_response :conflict
    assert_equal "shopping.version_conflict", response_json.dig("error", "code")

    patch "#{entries_path(household)}/#{entry.fetch('id')}/purchased", params: {
      purchased: false
    }, headers: headers.merge("If-Match" => current_version.to_s), as: :json
    assert_response :success
    assert_not response_json.dig("entry", "purchased")
    unchecked_version = response_json.dig("entry", "version")
    latest_activity = household.activities.order(:created_at).last
    assert_equal "Maya put Bread back on the list.", ActivitySerializer.render(latest_activity).fetch(:message)

    patch "#{entries_path(household)}/#{entry.fetch('id')}", params: {
      shoppingEntry: { quantity: 2, note: "Wholegrain" }
    }, headers: headers.merge("If-Match" => unchecked_version.to_s), as: :json
    assert_response :success
    assert_equal "Wholegrain", response_json.dig("entry", "note")
    edited_version = response_json.dig("entry", "version")

    delete "#{entries_path(household)}/#{entry.fetch('id')}",
      headers: headers.merge("If-Match" => edited_version.to_s)
    assert_response :no_content
    assert_empty household.shopping_list.shopping_entries.active
  end

  test "shopping identifiers cannot cross household boundaries" do
    owner = create_user
    outsider = create_user
    household = Households::Create.call(user: owner, name: "Private", timezone: "Etc/UTC")
    entry = Shopping::CreateEntry.call(
      household:,
      actor: owner,
      attributes: { name: "Private item" },
      idempotency_key: SecureRandom.uuid
    ).entry

    patch "#{entries_path(household)}/#{entry.id}/purchased", params: { purchased: true },
      headers: auth_headers(outsider).merge("If-Match" => entry.lock_version.to_s), as: :json

    assert_response :not_found
    assert_equal "resource.not_found", response_json.dig("error", "code")
  end

  test "database constraints reject invalid quantity and cross-household links" do
    user = create_user
    first = Households::Create.call(user:, name: "First", timezone: "Etc/UTC")
    second = Households::Create.call(user:, name: "Second", timezone: "Etc/UTC")
    item = Inventory::CreateItem.call(
      household: first, actor: user, attributes: { name: "Rice", status: "out" }
    ).item
    list = Shopping::ActiveList.call(household: second)
    entry = list.shopping_entries.new(
      name: "Rice", inventory_item: item, quantity: -1, idempotency_key: SecureRandom.uuid,
      added_by: user, updated_by: user
    )

    assert_not entry.valid?
    assert_includes entry.errors[:inventory_item], "must belong to the same household"
    assert entry.errors[:quantity].present?

    valid = list.shopping_entries.create!(
      name: "Bread", quantity: 1, idempotency_key: SecureRandom.uuid,
      added_by: user, updated_by: user
    )
    assert_raises(ActiveRecord::StatementInvalid) { valid.update_column(:quantity, -1) }
  end

  private

  def list_path(household)
    "/api/v1/households/#{household.id}/shopping-list"
  end

  def entries_path(household)
    "#{list_path(household)}/entries"
  end

  def create_entry(household:, headers:, name:)
    post entries_path(household), params: { shoppingEntry: { name: } },
      headers: headers.merge("Idempotency-Key" => SecureRandom.uuid), as: :json
    assert_response :created
    response_json.fetch("entry")
  end
end
