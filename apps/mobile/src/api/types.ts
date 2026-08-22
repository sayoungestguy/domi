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

export type InventoryStatus = 'ok' | 'low' | 'out';

export type Category = {
  id: string;
  name: string;
  position: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryItem = {
  id: string;
  householdId: string;
  name: string;
  status: InventoryStatus;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  category: Category | null;
  version: number;
  archivedAt: string | null;
  updatedBy: User;
  createdAt: string;
  updatedAt: string;
};

export type InventoryWarning = {
  code: string;
  message: string;
};

export type InventorySummary = {
  total: number;
  ok: number;
  low: number;
  out: number;
  needsAttention: number;
  updatedAt: string | null;
};

export type Activity = {
  id: string;
  action: string;
  message: string;
  actor: User;
  subjectType: string;
  subjectId: string;
  createdAt: string;
};

export type InventoryDashboard = {
  summary: InventorySummary;
  recentActivity: Activity[];
};

export type ShoppingEntry = {
  id: string;
  householdId: string;
  name: string;
  quantity: number | null;
  note: string | null;
  purchased: boolean;
  checkedAt: string | null;
  inventoryItemId: string | null;
  version: number;
  addedBy: User;
  updatedBy: User;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingList = {
  id: string;
  householdId: string;
  entries: ShoppingEntry[];
  remainingCount: number;
  purchasedCount: number;
  autoAddOutItems: boolean;
  updatedAt: string | null;
};
