import { apiRequest } from './client';
import type { Household, Invitation, InvitationSecret, Membership } from './types';

export function listHouseholds(): Promise<{ households: Household[] }> {
  return apiRequest('/api/v1/households');
}

export function createHousehold(name: string, timezone: string): Promise<{ household: Household }> {
  return apiRequest('/api/v1/households', {
    method: 'POST',
    body: { household: { name, timezone } },
  });
}

export function updateHousehold(
  householdId: string,
  input: { name?: string; timezone?: string },
): Promise<{ household: Household }> {
  return apiRequest(`/api/v1/households/${householdId}`, {
    method: 'PATCH',
    body: { household: input },
  });
}

export function joinHousehold(token: string): Promise<{ household: Household }> {
  return apiRequest('/api/v1/invitations/accept', {
    method: 'POST',
    body: { token },
  });
}

export function listMemberships(householdId: string): Promise<{ memberships: Membership[] }> {
  return apiRequest(`/api/v1/households/${householdId}/memberships`);
}

export function removeMembership(householdId: string, membershipId: string): Promise<void> {
  return apiRequest(`/api/v1/households/${householdId}/memberships/${membershipId}`, {
    method: 'DELETE',
  });
}

export function leaveHousehold(householdId: string): Promise<void> {
  return apiRequest(`/api/v1/households/${householdId}/membership`, { method: 'DELETE' });
}

export function transferOwnership(
  householdId: string,
  membershipId: string,
): Promise<{ membership: Membership }> {
  return apiRequest(`/api/v1/households/${householdId}/ownership`, {
    method: 'POST',
    body: { membershipId },
  });
}

export function createInvitation(householdId: string): Promise<InvitationSecret> {
  return apiRequest(`/api/v1/households/${householdId}/invitations`, { method: 'POST' });
}

export function listInvitations(householdId: string): Promise<{ invitations: Invitation[] }> {
  return apiRequest(`/api/v1/households/${householdId}/invitations`);
}

export function revokeInvitation(householdId: string, invitationId: string): Promise<void> {
  return apiRequest(`/api/v1/households/${householdId}/invitations/${invitationId}`, {
    method: 'DELETE',
  });
}
