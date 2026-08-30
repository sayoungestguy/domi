module Notifications
  class FanOut
    def self.call(household:, actor:, kind:, subject:)
      title, body = content(household:, actor:, kind:, subject:)
      preferences = household.notification_preferences.index_by(&:user_id)

      household.members.where.not(id: actor.id).find_each do |recipient|
        preference = preferences[recipient.id]
        next if preference && !preference.enabled_for?(kind)

        Notification.find_or_create_by!(
          household:,
          recipient:,
          kind:,
          subject_type: subject.class.name,
          subject_id: subject.id
        ) do |notification|
          notification.actor = actor
          notification.title = title
          notification.body = body
        end
      end
    end

    def self.content(household:, actor:, kind:, subject:)
      case kind
      when "member_joined"
        [ "New household member", "#{actor.display_name} joined #{household.name}." ]
      when "shopping_entry_added"
        [ "Shopping list updated", "#{actor.display_name} added #{subject.name} to shopping." ]
      when "shopping_trip_completed"
        count = subject.purchased_count
        [ "Shopping completed", "#{actor.display_name} finished shopping with #{count} #{'item'.pluralize(count)}." ]
      else
        raise ArgumentError, "Unsupported notification kind: #{kind}"
      end
    end
    private_class_method :content
  end
end
