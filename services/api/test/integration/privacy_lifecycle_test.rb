require "test_helper"

class PrivacyLifecycleTest < ActionDispatch::IntegrationTest
  test "account and owner-only household exports omit credentials and write audits" do
    owner = create_user(display_name: "Maya")
    member = create_user(display_name: "Alex")
    household = Households::Create.call(user: owner, name: "Home", timezone: "Etc/UTC")
    household.household_memberships.create!(user: member, role: "member")
    invitation = Households::CreateInvitation.call(household:, actor: owner)
    Inventory::CreateItem.call(household:, actor: owner, attributes: { name: "Milk", status: "ok" })

    get "/api/v1/me/export", headers: auth_headers(owner)
    assert_response :success
    assert_equal owner.email, response_json.dig("export", "account", "email")
    assert_equal 1, response_json.dig("export", "memberships").length

    get "/api/v1/households/#{household.id}/export", headers: auth_headers(owner)
    assert_response :success
    export = response_json.fetch("export")
    assert_equal "Home", export.dig("household", "name")
    assert_equal [ "Milk" ], export.fetch("inventoryItems").pluck("name")
    refute_includes response.body, invitation.token
    refute_includes response.body, invitation.invitation.token_digest

    get "/api/v1/households/#{household.id}/export", headers: auth_headers(member)
    assert_response :forbidden
    assert_equal 2, PrivacyAuditEvent.where(
      action: %w[privacy.account_exported privacy.household_exported]
    ).count
  end

  test "account deletion requires credentials and resolving owned households then erases identity" do
    owner = create_user(email: "maya@example.com", display_name: "Maya")
    successor = create_user(display_name: "Alex")
    household = Households::Create.call(user: owner, name: "Home", timezone: "Etc/UTC")
    membership = household.household_memberships.create!(user: successor, role: "member")
    headers = auth_headers(owner)

    delete "/api/v1/me", params: {
      currentPassword: PASSWORD, confirmation: "DELETE MY ACCOUNT"
    }, headers: headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "privacy.owned_households", response_json.dig("error", "code")

    Households::TransferOwnership.call(household:, actor: owner, target_membership: membership)
    delete "/api/v1/me", params: {
      currentPassword: "wrong password", confirmation: "DELETE MY ACCOUNT"
    }, headers: headers, as: :json
    assert_response :unprocessable_entity

    delete "/api/v1/me", params: {
      currentPassword: PASSWORD, confirmation: "DELETE MY ACCOUNT"
    }, headers: headers, as: :json
    assert_response :no_content

    owner.reload
    assert owner.deleted?
    assert_equal "Deleted member", owner.display_name
    assert_not_equal "maya@example.com", owner.email
    assert_empty owner.auth_sessions
    assert_empty owner.household_memberships
    assert PrivacyAuditEvent.exists?(action: "privacy.account_deleted", subject_id: owner.id)

    post "/api/v1/auth/session", params: {
      session: { email: "maya@example.com", password: PASSWORD }
    }, as: :json
    assert_response :unauthorized
  end

  test "only the owner can confirm and transactionally delete a household while retaining the audit" do
    owner = create_user
    member = create_user
    household = Households::Create.call(user: owner, name: "Private Home", timezone: "Etc/UTC")
    household.household_memberships.create!(user: member, role: "member")
    Inventory::CreateItem.call(household:, actor: owner, attributes: { name: "Rice", status: "ok" })

    delete "/api/v1/households/#{household.id}", params: { confirmation: "Private Home" },
      headers: auth_headers(member), as: :json
    assert_response :forbidden

    delete "/api/v1/households/#{household.id}", params: { confirmation: "wrong" },
      headers: auth_headers(owner), as: :json
    assert_response :unprocessable_entity

    delete "/api/v1/households/#{household.id}", params: { confirmation: "Private Home" },
      headers: auth_headers(owner), as: :json
    assert_response :no_content
    refute Household.exists?(household.id)
    assert PrivacyAuditEvent.exists?(action: "privacy.household_deleted", subject_id: household.id)
  end

  test "scheduled retention removes only data older than the documented windows and audits counts" do
    user = create_user
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")
    old_item = Inventory::CreateItem.call(
      household:, actor: user, attributes: { name: "Old", status: "ok" }
    ).item
    recent_item = Inventory::CreateItem.call(
      household:, actor: user, attributes: { name: "Recent", status: "ok" }
    ).item
    old_activity = household.activities.find_by!(subject_id: old_item.id)
    recent_activity = household.activities.find_by!(subject_id: recent_item.id)
    Activity.where(id: old_activity.id).update_all(created_at: 91.days.ago)

    Privacy::EnforceRetentionJob.perform_now(now: Time.current)

    refute Activity.exists?(old_activity.id)
    assert Activity.exists?(recent_activity.id)
    audit = PrivacyAuditEvent.where(action: "privacy.retention_enforced").last
    assert_equal 1, audit.metadata.fetch("activities")
  end
end
