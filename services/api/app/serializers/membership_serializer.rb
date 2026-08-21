module MembershipSerializer
  module_function

  def render(membership)
    {
      id: membership.id,
      role: membership.role,
      joinedAt: membership.created_at.iso8601,
      user: UserSerializer.render(membership.user)
    }
  end
end
