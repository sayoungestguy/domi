require "test_helper"

module Operations
  class BetaReadinessReportTest < ActiveSupport::TestCase
    include ActiveSupport::Testing::TimeHelpers

    test "reports aggregate beta measures without household or member content" do
      now = Time.zone.parse("2026-09-05 12:00:00")
      travel_to(now) do
        owner = create_user(email: "private-owner@example.com", display_name: "Private Owner")
        member = create_user(email: "private-member@example.com", display_name: "Private Member")
        household = Households::Create.call(user: owner, name: "Secret Household", timezone: "Etc/UTC")
        household.household_memberships.create!(user: member, role: "member")
        item = Inventory::CreateItem.call(
          household:,
          actor: owner,
          attributes: { name: "Private medicine", notes: "Sensitive note", status: "ok" }
        ).item
        Inventory::ChangeStatus.call(
          household:,
          actor: owner,
          item:,
          status: "low",
          expected_version: item.lock_version
        )
        Shopping::CreateEntry.call(
          household:,
          actor: owner,
          attributes: { name: "Private medicine" },
          idempotency_key: "report-entry-key"
        )

        report = BetaReadinessReport.call(now:)

        assert_equal "aggregate_only", report.dig(:privacy, :scope)
        assert_equal 1, report.dig(:product, :totalHouseholds)
        assert_equal 1, report.dig(:product, :newHouseholds)
        assert_equal 1, report.dig(:product, :weeklyActiveHouseholds)
        assert_equal 1, report.dig(:product, :activatedNewHouseholds)
        assert_equal 100.0, report.dig(:product, :activationRatePercent)
        assert_equal 1, report.dig(:product, :householdsWithMultipleMembers)
        assert_equal 1, report.dig(:product, :shoppingEntriesAdded)
        assert_equal 1, report.dig(:product, :inventoryStatusUpdates)
        assert_operator report.dig(:reliability, :pendingOutboxEvents), :>=, 1

        serialized = report.to_json
        refute_includes serialized, "Secret Household"
        refute_includes serialized, "private-owner@example.com"
        refute_includes serialized, "Private medicine"
        refute_includes serialized, "Sensitive note"
      end
    end

    test "uses zero rates and lag when there is no beta activity" do
      report = BetaReadinessReport.call

      assert_equal 0, report.dig(:product, :newHouseholds)
      assert_equal 0.0, report.dig(:product, :activationRatePercent)
      assert_equal 0, report.dig(:reliability, :pendingOutboxEvents)
      assert_equal 0, report.dig(:reliability, :oldestPendingOutboxSeconds)
    end
  end
end
