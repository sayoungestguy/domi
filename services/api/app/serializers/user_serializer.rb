module UserSerializer
  module_function

  def render(user)
    {
      id: user.id,
      email: user.deleted? ? "deleted-member@example.invalid" : user.email,
      displayName: user.deleted? ? "Deleted member" : user.display_name,
      emailVerified: user.email_verified?,
      createdAt: user.created_at.iso8601
    }
  end
end
