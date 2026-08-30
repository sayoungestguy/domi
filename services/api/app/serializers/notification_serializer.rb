module NotificationSerializer
  module_function

  def render(notification)
    {
      id: notification.id,
      kind: notification.kind,
      title: notification.title,
      body: notification.body,
      readAt: notification.read_at&.iso8601,
      actor: UserSerializer.render(notification.actor),
      subjectType: notification.subject_type,
      subjectId: notification.subject_id,
      createdAt: notification.created_at.iso8601
    }
  end
end
