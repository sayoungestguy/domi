import {
  API_URL,
  createHousehold,
  createInvitation,
  expect,
  joinHousehold,
  sessionTokens,
  signIn,
  test,
} from '../fixtures/domi.js';
import { seedVerifiedUser } from '../scripts/users.js';

test('a member can leave but cannot access owner governance or privacy actions', async ({
  browser,
  makeUser,
  request,
}) => {
  const owner = makeUser('GovernanceOwner');
  const member = makeUser('GovernanceMember');
  await Promise.all([seedVerifiedUser(owner), seedVerifiedUser(member)]);
  const householdName = `Governance ${Date.now().toString().slice(-6)}`;
  const ownerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const memberPage = await memberContext.newPage();

  try {
    await signIn(ownerPage, owner);
    await createHousehold(ownerPage, householdName);
    const invitation = await createInvitation(ownerPage);
    const ownerSession = await sessionTokens(ownerPage);
    const householdsResponse = await request.get(`${API_URL}/api/v1/households`, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
    });
    const householdId = (await householdsResponse.json()).households[0].id as string;

    await signIn(memberPage, member);
    await joinHousehold(memberPage, invitation, householdName);
    await memberPage.getByRole('tab', { name: 'Settings' }).click();

    await expect(memberPage.getByRole('button', { name: 'Leave household' })).toBeVisible();
    await expect(memberPage.getByRole('button', { name: 'Save household' })).not.toBeVisible();
    await expect(memberPage.getByRole('button', { name: 'Create invitation' })).not.toBeVisible();
    await expect(memberPage.getByRole('button', { name: 'Transfer ownership' })).not.toBeVisible();
    await expect(memberPage.getByRole('button', { name: 'Remove' })).not.toBeVisible();
    await expect(memberPage.getByRole('button', { name: 'Export household data' })).not.toBeVisible();
    await expect(memberPage.getByRole('button', { name: 'Delete household permanently' })).not.toBeVisible();

    const memberSession = await sessionTokens(memberPage);
    const headers = { Authorization: `Bearer ${memberSession.accessToken}` };
    const exportDenied = await request.get(`${API_URL}/api/v1/households/${householdId}/export`, {
      headers,
    });
    expect(exportDenied.status()).toBe(403);
    const deleteDenied = await request.delete(`${API_URL}/api/v1/households/${householdId}`, {
      headers,
      data: { confirmation: householdName },
    });
    expect(deleteDenied.status()).toBe(403);
  } finally {
    await ownerContext.close();
    await memberContext.close();
  }
});

test('account deletion remains blocked while the user owns a household', async ({ page, makeUser }) => {
  const owner = makeUser('DeleteBlocked');
  await seedVerifiedUser(owner);
  await signIn(page, owner);
  await createHousehold(page, `Owned ${Date.now().toString().slice(-6)}`);
  await page.getByRole('tab', { name: 'Settings' }).click();

  await page.getByLabel('Current password').fill(owner.password);
  await page.getByLabel('Type DELETE MY ACCOUNT').fill('DELETE MY ACCOUNT');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete my account permanently' }).click();

  await expect(
    page.getByText('Transfer ownership or delete your owned households first.'),
  ).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Inventory' })).toBeVisible();
});
