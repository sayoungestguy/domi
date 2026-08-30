module Api
  module V1
    class NotificationsController < BaseController
      before_action :authenticate_user!

      def index
        household = find_household!
        notifications = household.notifications.where(recipient: current_user)
          .includes(:actor).newest_first.limit(50)
        render json: {
          notifications: notifications.map { |notification| NotificationSerializer.render(notification) },
          unreadCount: household.notifications.where(recipient: current_user).unread.count
        }
      end

      def read
        notification = notification_scope.find(params[:id])
        notification.update!(read_at: Time.current) unless notification.read_at?
        render json: { notification: NotificationSerializer.render(notification) }
      end

      def read_all
        notification_scope.unread.update_all(read_at: Time.current, updated_at: Time.current)
        head :no_content
      end

      private

      def notification_scope
        find_household!.notifications.where(recipient: current_user)
      end
    end
  end
end
