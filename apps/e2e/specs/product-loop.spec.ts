import {
  createHousehold,
  createInvitation,
  expect,
  joinHousehold,
  signIn,
  test,
} from '../fixtures/domi.js';
import { InventoryPage } from '../pages/inventory.page.js';
import { ShoppingPage } from '../pages/shopping.page.js';
import { seedVerifiedUser } from '../scripts/users.js';

test('two members complete the inventory-to-shopping loop and share realtime updates', async ({
  browser,
  makeUser,
}) => {
  test.setTimeout(120_000);

  const owner = makeUser('Maya');
  const member = makeUser('Alex');
  await Promise.all([seedVerifiedUser(owner), seedVerifiedUser(member)]);

  const ownerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const memberPage = await memberContext.newPage();

  try {
    await signIn(ownerPage, owner);
    const householdName = `Home ${Date.now().toString().slice(-6)}`;
    await createHousehold(ownerPage, householdName);
    const invitation = await createInvitation(ownerPage);

    await signIn(memberPage, member);
    await joinHousehold(memberPage, invitation, householdName);
    const memberInventory = new InventoryPage(memberPage);
    await memberInventory.open();

    const ownerInventory = new InventoryPage(ownerPage);
    await ownerInventory.open();
    const itemName = `Milk ${Date.now().toString().slice(-5)}`;
    await ownerInventory.addItem(itemName, '2', 'Dairy');
    await expect(
      memberPage.getByTestId('inventory-item').filter({ hasText: itemName }),
    ).toBeVisible({ timeout: 2_000 });

    await ownerInventory.openEdit(itemName);
    await memberInventory.openEdit(itemName);
    await ownerPage.getByLabel('Quantity (optional)').fill('3');
    await ownerPage.getByRole('button', { name: 'Save item' }).click();
    await expect(ownerPage.getByText(`${itemName} was updated.`)).toBeVisible();
    await memberPage.getByLabel('Quantity (optional)').fill('4');
    await memberPage.getByRole('button', { name: 'Save item' }).click();
    await expect(memberPage.getByText('This item changed on another device.')).toBeVisible();
    await memberPage.getByRole('button', { name: 'Cancel' }).click();

    await ownerInventory.setStatus(itemName, 'LOW');
    await ownerPage.getByLabel('Search items').fill(itemName);
    await ownerPage.getByRole('button', { name: 'Apply filters' }).click();
    await expect(ownerPage.getByTestId('inventory-item').filter({ hasText: itemName })).toBeVisible();
    await ownerPage.getByLabel('Search items').fill('');
    await ownerPage.getByRole('button', { name: 'Apply filters' }).click();
    await ownerInventory.archiveAndRestore(itemName);

    const shopping = new ShoppingPage(ownerPage);
    await shopping.open();
    await ownerPage
      .getByLabel('Automatically add OUT inventory items to shopping', { exact: true })
      .click();
    await expect(ownerPage.getByText('Automatic addition is on.')).toBeVisible();
    await ownerInventory.open();
    await ownerInventory.setStatus(itemName, 'OUT');
    await shopping.open();
    await expect(ownerPage.getByTestId('shopping-entry').filter({ hasText: itemName })).toBeVisible();

    const shoppingName = `Bread ${Date.now().toString().slice(-5)}`;
    await shopping.addItem(shoppingName);
    const breadEntry = ownerPage.getByTestId('shopping-entry').filter({ hasText: shoppingName });
    await breadEntry.getByRole('button', { name: 'Edit' }).click();
    await ownerPage.getByLabel('Note (optional)').fill('Wholemeal');
    await ownerPage.getByRole('button', { name: 'Save entry' }).click();
    await expect(ownerPage.getByText(`${shoppingName} was updated.`)).toBeVisible();
    await shopping.check(shoppingName);
    await breadEntry.getByRole('checkbox').click();
    await expect(breadEntry.getByRole('checkbox')).toHaveAttribute(
      'aria-label',
      `${shoppingName}, not purchased`,
    );

    const removableName = `Eggs ${Date.now().toString().slice(-5)}`;
    await shopping.addItem(removableName);
    const removable = ownerPage.getByTestId('shopping-entry').filter({ hasText: removableName });
    ownerPage.once('dialog', (dialog) => dialog.accept());
    await removable.getByRole('button', { name: 'Remove' }).click();
    await expect(ownerPage.getByText(`${removableName} was removed.`)).toBeVisible();

    await shopping.check(itemName);

    let loseFirstCompletionResponse = true;
    await ownerPage.route('**/shopping-list/complete', async (route) => {
      if (!loseFirstCompletionResponse) {
        await route.continue();
        return;
      }
      loseFirstCompletionResponse = false;
      await route.fetch();
      await route.abort('connectionfailed');
    });
    ownerPage.once('dialog', (dialog) => dialog.accept());
    await ownerPage.getByRole('button', { name: 'Finish shopping' }).click();
    const retryFinish = ownerPage.getByRole('button', { name: 'Retry finish shopping' });
    const completedTrip = ownerPage.getByTestId('shopping-trip').filter({ hasText: '1 item' });
    await expect(retryFinish.or(completedTrip)).toBeVisible();
    if (!(await completedTrip.isVisible())) {
      ownerPage.once('dialog', (dialog) => dialog.accept());
      await retryFinish.click({ timeout: 3_000 }).catch(() => {
        // Realtime may converge between the visibility check and this click.
      });
    }
    await expect(completedTrip).toBeVisible();
    await expect(ownerPage.getByTestId('shopping-entry').filter({ hasText: shoppingName })).toBeVisible();

    await ownerInventory.open();
    await expect(
      ownerPage.getByTestId('inventory-item').filter({ hasText: itemName }).getByLabel('Status OK'),
    ).toBeVisible();

    await ownerPage.reload();
    await ownerPage.getByRole('tab', { name: 'Settings' }).click();
    await expect(ownerPage.getByText(member.email, { exact: false })).toBeVisible();
    await ownerPage.getByRole('tab', { name: 'Alerts' }).click();
    await expect(ownerPage.getByText(`${member.displayName} joined ${householdName}.`)).toBeVisible();
    await ownerPage.getByRole('button', { name: 'Mark read' }).first().click();
    await expect(ownerPage.getByText('0 unread')).toBeVisible();
  } finally {
    await ownerContext.close();
    await memberContext.close();
  }
});
