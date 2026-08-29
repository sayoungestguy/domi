import {
  createHousehold,
  createInvitation,
  expect,
  joinHousehold,
  signIn,
  test,
} from '../fixtures/domi.js';
import { InventoryPage } from '../pages/inventory.page.js';
import { seedVerifiedUser } from '../scripts/users.js';

test('a dropped event creates a gap and the next event converges from authoritative state', async ({
  browser,
  makeUser,
}) => {
  const owner = makeUser('GapOwner');
  const member = makeUser('GapMember');
  await Promise.all([seedVerifiedUser(owner), seedVerifiedUser(member)]);

  const ownerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  let householdEventsToDrop = 0;
  await memberContext.routeWebSocket(/\/cable$/, (client) => {
    const server = client.connectToServer();
    server.onMessage((message) => {
      const parsed = JSON.parse(message.toString()) as { message?: { type?: string } };
      if (parsed.message?.type === 'household.changed' && householdEventsToDrop > 0) {
        householdEventsToDrop -= 1;
        return;
      }
      client.send(message);
    });
  });

  const ownerPage = await ownerContext.newPage();
  const memberPage = await memberContext.newPage();
  try {
    await signIn(ownerPage, owner);
    const householdName = `Gap home ${Date.now().toString().slice(-6)}`;
    await createHousehold(ownerPage, householdName);
    const invitation = await createInvitation(ownerPage);
    await signIn(memberPage, member);
    await joinHousehold(memberPage, invitation, householdName);

    const memberInventory = new InventoryPage(memberPage);
    const ownerInventory = new InventoryPage(ownerPage);
    await memberInventory.open();
    await ownerInventory.open();

    householdEventsToDrop = 1;
    const first = `Dropped ${Date.now().toString().slice(-5)}`;
    const second = `Delivered ${Date.now().toString().slice(-5)}`;
    await ownerInventory.addItem(first);
    await expect(memberPage.getByText(first, { exact: true })).not.toBeVisible();
    await ownerInventory.addItem(second);

    await expect(memberPage.getByText(first, { exact: true })).toBeVisible();
    await expect(memberPage.getByText(second, { exact: true })).toBeVisible();

    await memberPage.getByRole('tab', { name: 'Shopping' }).click();
    await expect(memberPage.getByText('Shopping mode')).toBeVisible();
    await memberPage.getByRole('tab', { name: 'Inventory' }).click();
    await memberContext.route('**/api/**', (route) => route.abort('internetdisconnected'));
    await memberPage.getByRole('tab', { name: 'Shopping' }).click();
    await expect(memberPage.getByText(/You’re offline. Showing shopping saved/)).toBeVisible();
  } finally {
    await ownerContext.close();
    await memberContext.close();
  }
});
