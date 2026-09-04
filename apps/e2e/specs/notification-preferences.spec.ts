import {
  createHousehold,
  createInvitation,
  expect,
  joinHousehold,
  signIn,
  test,
} from '../fixtures/domi.js';
import { ShoppingPage } from '../pages/shopping.page.js';
import { seedVerifiedUser } from '../scripts/users.js';

test('shopping notifications honor opt-out, opt-in, and mark-all-read', async ({ browser, makeUser }) => {
  const owner = makeUser('NotifyOwner');
  const member = makeUser('NotifyMember');
  await Promise.all([seedVerifiedUser(owner), seedVerifiedUser(member)]);
  const householdName = `Notify ${Date.now().toString().slice(-6)}`;
  const ownerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const memberPage = await memberContext.newPage();

  try {
    await signIn(ownerPage, owner);
    await createHousehold(ownerPage, householdName);
    const invitation = await createInvitation(ownerPage);
    await signIn(memberPage, member);
    await joinHousehold(memberPage, invitation, householdName);

    await memberPage.getByRole('tab', { name: 'Alerts' }).click();
    const preference = memberPage.getByRole('switch', { name: 'New shopping entries' });
    await expect(preference).toBeChecked();
    const disabled = memberPage.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname.endsWith('/notification-preference') &&
        response.ok(),
    );
    await preference.click();
    await disabled;
    await expect(preference).not.toBeChecked();

    const shopping = new ShoppingPage(ownerPage);
    await shopping.open();
    await shopping.addItem('Suppressed milk');
    await memberPage.reload();
    await memberPage.getByRole('tab', { name: 'Alerts' }).click();
    await expect(memberPage.getByText(/added Suppressed milk to shopping/)).not.toBeVisible();
    await expect(memberPage.getByText('0 unread')).toBeVisible();
    await expect(preference).not.toBeChecked();

    const enabled = memberPage.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname.endsWith('/notification-preference') &&
        response.ok(),
    );
    await preference.click();
    await enabled;
    await expect(preference).toBeChecked();
    await shopping.addItem('Visible bread');

    await memberPage.reload();
    await memberPage.getByRole('tab', { name: 'Alerts' }).click();
    await expect(memberPage.getByText(`${owner.displayName} added Visible bread to shopping.`)).toBeVisible();
    await expect(memberPage.getByText('1 unread')).toBeVisible();
    await memberPage.getByRole('button', { name: 'Mark all read' }).click();
    await expect(memberPage.getByText('0 unread')).toBeVisible();
    await expect(memberPage.getByRole('button', { name: 'Mark all read' })).not.toBeVisible();
  } finally {
    await ownerContext.close();
    await memberContext.close();
  }
});
