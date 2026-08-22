module ActivitySerializer
  module_function

  def render(activity)
    {
      id: activity.id,
      action: activity.action,
      message: message(activity),
      actor: UserSerializer.render(activity.actor),
      subjectType: activity.subject_type,
      subjectId: activity.subject_id,
      createdAt: activity.created_at.iso8601
    }
  end

  def message(activity)
    name = activity.metadata.fetch("itemName", "an item")
    actor = activity.actor.display_name
    case activity.action
    when "inventory.item_created" then "#{actor} added #{name}."
    when "inventory.item_updated" then "#{actor} updated #{name}."
    when "inventory.status_changed"
      "#{actor} marked #{name} #{activity.metadata.fetch('toStatus', '').upcase}."
    when "inventory.item_archived" then "#{actor} archived #{name}."
    when "inventory.item_restored" then "#{actor} restored #{name}."
    when "shopping.entry_added" then "#{actor} added #{name} to shopping."
    when "shopping.entry_updated" then "#{actor} updated #{name} on shopping."
    when "shopping.entry_checked" then "#{actor} checked off #{name}."
    when "shopping.entry_unchecked" then "#{actor} put #{name} back on the list."
    when "shopping.entry_removed" then "#{actor} removed #{name} from shopping."
    when "shopping.preference_updated" then "#{actor} changed the shopping preference."
    else "#{actor} changed #{name}."
    end
  end
  private_class_method :message
end
