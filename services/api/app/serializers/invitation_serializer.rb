module InvitationSerializer
  module_function

  def render(invitation)
    {
      id: invitation.id,
      expiresAt: invitation.expires_at.iso8601,
      revokedAt: invitation.revoked_at&.iso8601,
      acceptedAt: invitation.accepted_at&.iso8601,
      createdAt: invitation.created_at.iso8601,
      createdBy: UserSerializer.render(invitation.created_by)
    }
  end
end
