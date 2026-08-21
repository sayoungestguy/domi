export type User = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  createdAt: string;
};

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
};

export type AuthenticatedResponse = {
  user: User;
  session: SessionTokens;
};

export type Household = {
  id: string;
  name: string;
  timezone: string;
  role: 'owner' | 'member';
  version: number;
  createdAt: string;
};

export type Membership = {
  id: string;
  role: 'owner' | 'member';
  joinedAt: string;
  user: User;
};

export type Invitation = {
  id: string;
  expiresAt: string;
  revokedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  createdBy: User;
};

export type InvitationSecret = {
  invitation: Invitation;
  token: string;
  inviteUrl: string;
};
