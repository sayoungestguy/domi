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
    else "#{actor} changed #{name}."
    end
  end
  private_class_method :message
end
