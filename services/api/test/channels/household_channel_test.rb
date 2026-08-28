require "test_helper"

class HouseholdChannelTest < ActionCable::Channel::TestCase
  test "verified member token subscribes to only that household stream" do
    user = create_user
    household = Households::Create.call(user:, name: "Home", timezone: "Etc/UTC")
    token = Authentication::IssueSession.call(
      user:, user_agent: "cable-test", ip_address: "127.0.0.1"
    ).access_token

    subscribe(householdId: household.id, token:)

    assert subscription.confirmed?
    assert_has_stream_for household
  end

  test "outsider and expired credentials are rejected" do
    owner = create_user
    outsider = create_user
    household = Households::Create.call(user: owner, name: "Private", timezone: "Etc/UTC")
    outsider_session = Authentication::IssueSession.call(
      user: outsider, user_agent: "cable-test", ip_address: "127.0.0.1"
    )

    subscribe householdId: household.id, token: outsider_session.access_token
    assert subscription.rejected?

    expired_session = Authentication::IssueSession.call(
      user: owner, user_agent: "cable-test", ip_address: "127.0.0.1"
    )
    expired_session.session.update!(access_expires_at: 1.minute.ago)
    subscribe householdId: household.id, token: expired_session.access_token
    assert subscription.rejected?
  end
end
