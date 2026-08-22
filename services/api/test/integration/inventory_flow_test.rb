require "test_helper"

class InventoryFlowTest < ActionDispatch::IntegrationTest
  test "household members share inventory and every material change is attributed" do
    owner = create_user(display_name: "Maya")
    member = create_user(display_name: "Alex")
    household = Households::Create.call(user: owner, name: "Home", timezone: "Etc/UTC")
    household.household_memberships.create!(user: member, role: "member")

    post "/api/v1/households/#{household.id}/categories", params: {
      category: { name: "Kitchen", position: 1 }
    }, headers: auth_headers(owner), as: :json
    assert_response :created
    category_id = response_json.dig("category", "id")

    post "/api/v1/households/#{household.id}/inventory-items", params: {
      inventoryItem: {
        name: "Rice", status: "ok", quantity: 2, unit: "kg",
        notes: "Jasmine", categoryId: category_id
      }
    }, headers: auth_headers(owner), as: :json
    assert_response :created
    item_id = response_json.dig("item", "id")
    version = response_json.dig("item", "version")
    assert_empty response_json.fetch("warnings")

    get "/api/v1/households/#{household.id}/inventory-items", headers: auth_headers(member)
    assert_response :success
    assert_equal [ "Rice" ], response_json.fetch("items").pluck("name")

    patch "/api/v1/households/#{household.id}/inventory-items/#{item_id}/status", params: {
      status: "low", expectedVersion: version
    }, headers: auth_headers(member), as: :json
    assert_response :success
    assert_equal "low", response_json.dig("item", "status")

    activities = household.activities.includes(:actor).order(:created_at)
    assert_equal %w[inventory.item_created inventory.status_changed], activities.pluck(:action)
    assert_equal [ owner.id, member.id ], activities.pluck(:actor_id)
    assert_equal "Alex marked Rice LOW.", ActivitySerializer.render(activities.last).fetch(:message)
  end

  test "duplicate names warn while search status filters and summary remain authoritative" do
    user = create_user
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")
    headers = auth_headers(user)

    create_item(household:, headers:, name: "Milk", status: "low")
    duplicate = create_item(household:, headers:, name: "milk", status: "out")
    assert_equal "inventory.duplicate_name", duplicate.fetch("warnings").first.fetch("code")
    create_item(household:, headers:, name: "Bread", status: "ok")

    get "/api/v1/households/#{household.id}/inventory-items", params: {
      query: "mil", status: "out"
    }, headers: headers
    assert_response :success
    assert_equal [ "milk" ], response_json.fetch("items").pluck("name")

    get "/api/v1/households/#{household.id}/inventory/summary", headers: headers
    assert_response :success
    assert_equal 3, response_json.dig("summary", "total")
    assert_equal 2, response_json.dig("summary", "needsAttention")
    assert_equal 3, response_json.fetch("recentActivity").length
  end

  test "stale edits conflict and archive restore preserves the item" do
    user = create_user
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")
    headers = auth_headers(user)
    created = create_item(household:, headers:, name: "Soap", status: "ok")
    item = created.fetch("item")

    patch "/api/v1/households/#{household.id}/inventory-items/#{item.fetch("id")}", params: {
      inventoryItem: { quantity: 3 }, expectedVersion: item.fetch("version")
    }, headers:, as: :json
    assert_response :success

    patch "/api/v1/households/#{household.id}/inventory-items/#{item.fetch("id")}/status", params: {
      status: "out", expectedVersion: item.fetch("version")
    }, headers:, as: :json
    assert_response :conflict
    assert_equal "inventory.version_conflict", response_json.dig("error", "code")

    current_version = InventoryItem.find(item.fetch("id")).lock_version
    post "/api/v1/households/#{household.id}/inventory-items/#{item.fetch("id")}/archive", params: {
      expectedVersion: current_version
    }, headers:, as: :json
    assert_response :success
    archived_version = response_json.dig("item", "version")

    get "/api/v1/households/#{household.id}/inventory-items", headers: headers
    assert_response :success
    assert_empty response_json.fetch("items")

    post "/api/v1/households/#{household.id}/inventory-items/#{item.fetch("id")}/restore", params: {
      expectedVersion: archived_version
    }, headers:, as: :json
    assert_response :success
    assert_nil response_json.dig("item", "archivedAt")
  end

  test "inventory identifiers cannot cross the household boundary" do
    owner = create_user
    outsider = create_user
    household = Households::Create.call(user: owner, name: "Private", timezone: "Etc/UTC")
    item = Inventory::CreateItem.call(
      household:, actor: owner, attributes: { name: "Private item", status: "ok" }
    ).item

    get "/api/v1/households/#{household.id}/inventory-items/#{item.id}",
      headers: auth_headers(outsider)

    assert_response :not_found
    assert_equal "resource.not_found", response_json.dig("error", "code")
  end

  test "database and model constraints reject invalid state and cross-household categories" do
    user = create_user
    first = Households::Create.call(user:, name: "First", timezone: "Etc/UTC")
    second = Households::Create.call(user:, name: "Second", timezone: "Etc/UTC")
    category = first.categories.create!(name: "Kitchen")

    item = second.inventory_items.new(
      name: "Rice", status: "ok", category:, created_by: user, updated_by: user
    )
    assert_not item.valid?
    assert_includes item.errors[:category], "must belong to the same household"

    valid = first.inventory_items.create!(
      name: "Flour", status: "ok", created_by: user, updated_by: user
    )
    assert_raises(ActiveRecord::StatementInvalid) do
      valid.update_column(:status, "unknown")
    end
  end

  private

  def create_item(household:, headers:, name:, status:)
    post "/api/v1/households/#{household.id}/inventory-items", params: {
      inventoryItem: { name:, status: }
    }, headers:, as: :json
    assert_response :created
    response_json
  end
end
