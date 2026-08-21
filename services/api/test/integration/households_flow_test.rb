require "test_helper"

class HouseholdsFlowTest < ActionDispatch::IntegrationTest
  test "two users create, join, and manage one household" do
    owner = create_user(display_name: "Owner")
    member = create_user(display_name: "Member")
    owner_headers = auth_headers(owner)
    member_headers = auth_headers(member)

    post "/api/v1/households", params: {
      household: { name: "Tan Home", timezone: "Asia/Singapore" }
    }, headers: owner_headers, as: :json
    assert_response :created
    household_id = response_json.dig("household", "id")
    assert_equal "owner", response_json.dig("household", "role")

    post "/api/v1/households/#{household_id}/invitations", headers: owner_headers, as: :json
    assert_response :created
    invitation_token = response_json.fetch("token")

    post "/api/v1/invitations/accept", params: { token: invitation_token },
      headers: member_headers, as: :json
    assert_response :created
    assert_equal "member", response_json.dig("household", "role")

    get "/api/v1/households/#{household_id}/memberships", headers: member_headers
    assert_response :success
    assert_equal 2, response_json.fetch("memberships").length

    patch "/api/v1/households/#{household_id}", params: {
      household: { name: "Not Allowed" }
    }, headers: member_headers, as: :json
    assert_response :forbidden

    member_membership = HouseholdMembership.find_by!(household_id:, user: member)
    post "/api/v1/households/#{household_id}/ownership", params: {
      membershipId: member_membership.id
    }, headers: owner_headers, as: :json
    assert_response :success
    assert_equal "owner", member_membership.reload.role
    assert_equal "member", HouseholdMembership.find_by!(household_id:, user: owner).role

    patch "/api/v1/households/#{household_id}", params: {
      household: { name: "Our Home" }
    }, headers: member_headers, as: :json
    assert_response :success
    assert_equal "Our Home", response_json.dig("household", "name")
  end

  test "household identifiers cannot cross the membership boundary" do
    owner = create_user
    outsider = create_user
    household = Households::Create.call(user: owner, name: "Private", timezone: "Etc/UTC")

    get "/api/v1/households/#{household.id}", headers: auth_headers(outsider)

    assert_response :not_found
    assert_equal "resource.not_found", response_json.dig("error", "code")
  end

  test "expired revoked and used invitations are rejected" do
    owner = create_user
    first_member = create_user
    second_member = create_user
    household = Households::Create.call(user: owner, name: "Home", timezone: "Etc/UTC")

    expired = Households::CreateInvitation.call(
      household:, actor: owner, expires_in: -1.minute
    )
    assert_raises(DomainError) do
      Households::AcceptInvitation.call(user: first_member, token: expired.token)
    end

    revoked = Households::CreateInvitation.call(household:, actor: owner)
    revoked.invitation.update!(revoked_at: Time.current)
    assert_raises(DomainError) do
      Households::AcceptInvitation.call(user: first_member, token: revoked.token)
    end

    used = Households::CreateInvitation.call(household:, actor: owner)
    Households::AcceptInvitation.call(user: first_member, token: used.token)
    error = assert_raises(DomainError) do
      Households::AcceptInvitation.call(user: second_member, token: used.token)
    end
    assert_equal "household.invalid_invitation", error.code
  end

  test "an owner cannot leave or be removed and the database prevents a second owner" do
    owner = create_user
    member = create_user
    household = Households::Create.call(user: owner, name: "Home", timezone: "Etc/UTC")
    member_membership = household.household_memberships.create!(user: member, role: "member")

    leave_error = assert_raises(DomainError) do
      Households::Leave.call(household:, user: owner)
    end
    assert_equal "household.owner_cannot_leave", leave_error.code

    remove_error = assert_raises(DomainError) do
      Households::RemoveMember.call(
        household:,
        actor: owner,
        target_membership: household.owner_membership
      )
    end
    assert_equal "household.owner_cannot_be_removed", remove_error.code

    assert_raises(ActiveRecord::RecordNotUnique) do
      member_membership.update_column(:role, "owner")
    end
  end

  test "a member can leave and an owner can remove another member" do
    owner = create_user
    first = create_user
    second = create_user
    household = Households::Create.call(user: owner, name: "Home", timezone: "Etc/UTC")
    first_membership = household.household_memberships.create!(user: first, role: "member")
    household.household_memberships.create!(user: second, role: "member")

    Households::RemoveMember.call(household:, actor: owner, target_membership: first_membership)
    assert_not HouseholdMembership.exists?(household:, user: first)

    Households::Leave.call(household:, user: second)
    assert_not HouseholdMembership.exists?(household:, user: second)
  end
end
