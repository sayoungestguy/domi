import { createHousehold, expect, registerAndVerify, test } from '../fixtures/domi.js';

test('owner deletes a household before permanently deleting the account', async ({ page, makeUser }) => {
  const user = makeUser('Privacy');
  await registerAndVerify(page, user);
  const householdName = `Private ${Date.now().toString().slice(-6)}`;
  await createHousehold(page, householdName);

  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByLabel('Type household name to delete').fill(householdName);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete household permanently' }).click();
  await expect(page.getByText('Household deleted.')).toBeVisible();
  await expect(page.getByText('Create your first home')).toBeVisible();

  await page.getByLabel('Current password').fill(user.password);
  await page.getByLabel('Type DELETE MY ACCOUNT').fill('DELETE MY ACCOUNT');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete my account permanently' }).click();
  await expect(page.getByRole('heading', { name: 'Domi' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
