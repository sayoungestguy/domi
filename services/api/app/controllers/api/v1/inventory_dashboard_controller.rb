module Api
  module V1
    class InventoryDashboardController < BaseController
      before_action :authenticate_user!

      def show
        household = find_household!
        active = household.inventory_items.active
        counts = active.group(:status).count
        activities = household.activities.includes(:actor).order(created_at: :desc).limit(10)
        render json: {
          summary: {
            total: counts.values.sum,
            ok: counts.fetch("ok", 0),
            low: counts.fetch("low", 0),
            out: counts.fetch("out", 0),
            needsAttention: counts.fetch("low", 0) + counts.fetch("out", 0),
            updatedAt: active.maximum(:updated_at)&.iso8601
          },
          recentActivity: activities.map { |activity| ActivitySerializer.render(activity) }
        }
      end
    end
  end
end
