require "test_helper"

class NotificationsFlowTest < ActionDispatch::IntegrationTest
  test "household events create private recipient notifications that can be read" do
    owner = create_user(display_name: "Maya")
    member = create_user(display_name: "Alex")
    outsider = create_user(display_name: "Noah")
    household = Households::Create.call(user: owner, name: "Home", timezone: "Etc/UTC")
    household.household_memberships.create!(user: member, role: "member")

    post entries_path(household), params: { shoppingEntry: { name: "Milk" } },
      headers: auth_headers(owner).merge("Idempotency-Key" => "milk-#{SecureRandom.uuid}"), as: :json
    assert_response :created
    assert_equal 1, member.received_notifications.count
    assert_empty owner.received_notifications

    get notifications_path(household), headers: auth_headers(member)
    assert_response :success
    assert_equal 1, response_json.fetch("unreadCount")
    notification = response_json.fetch("notifications").first
    assert_equal "shopping_entry_added", notification.fetch("kind")
    assert_equal "Maya added Milk to shopping.", notification.fetch("body")
    assert_nil notification.fetch("readAt")

    patch "#{notifications_path(household)}/#{notification.fetch('id')}/read",
      headers: auth_headers(member)
    assert_response :success
    assert response_json.dig("notification", "readAt").present?

    get notifications_path(household), headers: auth_headers(outsider)
    assert_response :not_found
  end

  test "preferences suppress categories and repeated commands do not duplicate delivery" do
    owner = create_user(display_name: "Maya")
    member = create_user(display_name: "Alex")
    household = Households::Create.call(user: owner, name: "Home", timezone: "Etc/UTC")
    household.household_memberships.create!(user: member, role: "member")
    headers = auth_headers(member)

    get preference_path(household), headers: headers
    assert_response :success
    assert response_json.dig("notificationPreference", "shoppingEntryAdded")

    patch preference_path(household), params: {
      notificationPreference: {
        memberJoined: true,
        shoppingEntryAdded: false,
        shoppingTripCompleted: true
      }
    }, headers:, as: :json
    assert_response :success
    assert_not response_json.dig("notificationPreference", "shoppingEntryAdded")

    key = "bread-#{SecureRandom.uuid}"
    2.times do
      post entries_path(household), params: { shoppingEntry: { name: "Bread" } },
        headers: auth_headers(owner).merge("Idempotency-Key" => key), as: :json
      assert_includes [ 200, 201 ], response.status
    end
    assert_empty member.received_notifications

    entry = household.shopping_list.shopping_entries.active.find_by!(name: "Bread")
    entry.update!(purchased: true, checked_at: Time.current)
    trip_key = "trip-#{SecureRandom.uuid}"
    2.times do
      post "#{list_path(household)}/complete", params: { restockInventoryItems: false },
        headers: auth_headers(owner).merge("Idempotency-Key" => trip_key), as: :json
      assert_includes [ 200, 201 ], response.status
    end
    assert_equal [ "shopping_trip_completed" ], member.received_notifications.pluck(:kind)

    patch "#{notifications_path(household)}/read-all", headers: headers
    assert_response :no_content
    assert_empty member.received_notifications.unread
  end

  test "accepting an invitation notifies existing members but not the joiner" do
    owner = create_user(display_name: "Maya")
    joiner = create_user(display_name: "Alex")
    household = Households::Create.call(user: owner, name: "Home", timezone: "Etc/UTC")
    invitation = Households::CreateInvitation.call(household:, actor: owner)

    post "/api/v1/invitations/accept", params: { token: invitation.token },
      headers: auth_headers(joiner), as: :json
    assert_response :created
    assert_equal "member_joined", owner.received_notifications.first.kind
    assert_equal "Alex joined Home.", owner.received_notifications.first.body
    assert_empty joiner.received_notifications
    assert_equal "household.member_joined", household.outbox_events.last.payload.fetch("action")
  end

  private

  def notifications_path(household)
    "/api/v1/households/#{household.id}/notifications"
  end

  def preference_path(household)
    "/api/v1/households/#{household.id}/notification-preference"
  end

  def list_path(household)
    "/api/v1/households/#{household.id}/shopping-list"
  end

  def entries_path(household)
    "#{list_path(household)}/entries"
  end
end
