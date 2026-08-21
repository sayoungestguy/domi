module UserSerializer
  module_function

  def render(user)
    {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      emailVerified: user.email_verified?,
      createdAt: user.created_at.iso8601
    }
  end
end
