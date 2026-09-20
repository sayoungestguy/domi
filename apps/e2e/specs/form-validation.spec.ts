import { createHousehold, expect, signIn, test } from '../fixtures/domi.js';
import { InventoryPage } from '../pages/inventory.page.js';
import { seedVerifiedUser } from '../scripts/users.js';

test('registration reports each changed invalid field and clears errors independently', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();

  const email = page.getByLabel('Email');
  const password = page.getByLabel('Password', { exact: true });
  const confirmation = page.getByLabel('Confirm password');
  const submit = page.getByRole('button', { name: 'Create account' });

  await email.fill('not-an-email');
  await password.fill('short');
  await confirmation.fill('different');

  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Password must contain at least 12 characters.')).toBeVisible();
  await expect(page.getByText('Passwords do not match.')).toBeVisible();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(confirmation).toHaveAttribute('aria-invalid', 'true');
  await expect(submit).toBeDisabled();

  await email.fill('valid@example.test');
  await password.fill('A sufficiently long password');
  await confirmation.fill('A sufficiently long password');

  await expect(page.getByText('Enter a valid email address.')).not.toBeVisible();
  await expect(page.getByText('Password must contain at least 12 characters.')).not.toBeVisible();
  await expect(page.getByText('Passwords do not match.')).not.toBeVisible();
  await expect(email).toHaveAttribute('aria-invalid', 'false');
  await expect(password).toHaveAttribute('aria-invalid', 'false');
  await expect(confirmation).toHaveAttribute('aria-invalid', 'false');
  await expect(submit).toBeDisabled();

  await page.getByLabel('Your name').fill('Validation User');
  await expect(submit).toBeEnabled();
});

test('invalid credentials reveal no account details and do not create a session', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill(`missing-${Date.now()}@example.test`);
  await page.getByLabel('Password').fill('A sufficiently long password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText('The email address or password is incorrect.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Domi' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Inventory' })).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('domi.mobile-session.v1')))
    .toBeNull();
});

test('inventory rejects negative quantities while allowing a warned duplicate name', async ({
  page,
  makeUser,
}) => {
  const user = makeUser('InventoryValidation');
  await seedVerifiedUser(user);
  await signIn(page, user);
  await createHousehold(page, `Validation ${Date.now().toString().slice(-6)}`);

  const inventory = new InventoryPage(page);
  await inventory.open();
  await inventory.addItem('Rice', '1');

  await page.getByRole('button', { name: 'Add item' }).first().click();
  await page.getByLabel('Item name').fill('Rice');
  const quantity = page.getByLabel('Quantity (optional)');
  const add = page.getByRole('button', { name: 'Add item', exact: true }).last();
  await quantity.fill('-1');

  await expect(page.getByText('Quantity must be zero or greater.')).toBeVisible();
  await expect(quantity).toHaveAttribute('aria-invalid', 'true');
  await expect(add).toBeDisabled();

  await quantity.fill('2');
  await expect(page.getByText('Quantity must be zero or greater.')).not.toBeVisible();
  await expect(quantity).toHaveAttribute('aria-invalid', 'false');
  await expect(add).toBeEnabled();
  await add.click();

  await expect(page.getByText('An active item with this name already exists.')).toBeVisible();
  await expect(page.getByTestId('inventory-item').filter({ hasText: 'Rice' })).toHaveCount(2);
});
