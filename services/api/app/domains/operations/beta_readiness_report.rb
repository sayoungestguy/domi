module Operations
  class BetaReadinessReport
    WINDOW = 7.days
    MEANINGFUL_ACTIONS = %w[
      inventory.item_created
      inventory.item_updated
      inventory.status_changed
      shopping.entry_added
      shopping.entry_checked
      shopping.trip_completed
    ].freeze

    def self.call(now: Time.current)
      new(now:).call
    end

    def initialize(now:)
      @now = now
      @window_start = now - WINDOW
    end

    def call
      {
        generatedAt: now.iso8601,
        release: ENV.fetch("APP_VERSION", "development"),
        privacy: { scope: "aggregate_only", windowDays: 7 },
        product: product_metrics,
        reliability: reliability_metrics
      }
    end

    private

    attr_reader :now, :window_start

    def product_metrics
      recent_households = Household.where(created_at: window_start..now)
      recent_household_ids = recent_households.select(:id)
      active_households = meaningful_activity.where(created_at: window_start..now)
                                             .distinct.count(:household_id)
      activated_new_households = meaningful_activity.where(household_id: recent_household_ids)
                                                     .distinct.count(:household_id)
      new_households = recent_households.count

      {
        totalHouseholds: Household.count,
        newHouseholds: new_households,
        weeklyActiveHouseholds: active_households,
        activatedNewHouseholds: activated_new_households,
        activationRatePercent: percentage(activated_new_households, new_households),
        householdsWithMultipleMembers: households_with_multiple_members,
        shoppingEntriesAdded: activity_count("shopping.entry_added"),
        shoppingTripsCompleted: activity_count("shopping.trip_completed"),
        inventoryStatusUpdates: activity_count("inventory.status_changed")
      }
    end

    def reliability_metrics
      pending = OutboxEvent.pending
      oldest = pending.minimum(:created_at)

      {
        pendingOutboxEvents: pending.count,
        retriedOutboxEvents: pending.where("attempts > 0").count,
        oldestPendingOutboxSeconds: oldest ? [ (now - oldest).round, 0 ].max : 0
      }
    end

    def meaningful_activity
      Activity.where(action: MEANINGFUL_ACTIONS)
    end

    def activity_count(action)
      Activity.where(action:, created_at: window_start..now).count
    end

    def households_with_multiple_members
      HouseholdMembership.group(:household_id).having("COUNT(*) >= 2").count.length
    end

    def percentage(numerator, denominator)
      return 0.0 if denominator.zero?

      ((numerator.to_f / denominator) * 100).round(1)
    end
  end
end
