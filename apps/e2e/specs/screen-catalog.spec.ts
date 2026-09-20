import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import type { Page, TestInfo } from '@playwright/test';

import {
  createHousehold,
  createInvitation,
  expect,
  joinHousehold,
  signIn,
  test,
} from '../fixtures/domi.js';
import { seedVerifiedUser } from '../scripts/users.js';

const screenshotRoot = path.resolve(import.meta.dirname, '../../../screenshots');

async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const projectDirectory = path.join(screenshotRoot, testInfo.project.name);
  await mkdir(projectDirectory, { recursive: true });
  await page.screenshot({
    animations: 'disabled',
    fullPage: true,
    path: path.join(projectDirectory, `${name}.png`),
  });
}

test.describe('screen catalogue', () => {
  test('captures every signed-out authentication screen', async ({ page, makeUser }, testInfo) => {
    test.setTimeout(90_000);
    const user = makeUser('ScreenshotAuth');

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Domi' })).toBeVisible();
    await capture(page, testInfo, '01-auth-sign-in');

    await page.getByRole('button', { name: 'Create an account' }).click();
    await expect(page.getByRole('heading', { name: 'Create your Domi account' })).toBeVisible();
    await capture(page, testInfo, '02-auth-register');

    await page.getByLabel('Your name').fill('Screenshot User');
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Confirm password').fill('different');
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await capture(page, testInfo, '03-auth-register-validation');

    await page.getByLabel('Your name').fill(user.displayName);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByLabel('Confirm password').fill(user.password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
    await capture(page, testInfo, '04-auth-verify-email');

    await page.getByRole('button', { name: 'Back to sign in' }).click();
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
    await capture(page, testInfo, '05-auth-forgot-password');

    await page.getByRole('button', { name: 'I have a reset token' }).click();
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await capture(page, testInfo, '06-auth-reset-password');
  });

  test('captures owner and member application screens', async ({ browser, makeUser }, testInfo) => {
    test.setTimeout(120_000);
    const owner = makeUser('ScreenshotOwner');
    const member = makeUser('ScreenshotMember');
    await Promise.all([seedVerifiedUser(owner), seedVerifiedUser(member)]);

    const ownerContext = await browser.newContext();
    const memberContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const memberPage = await memberContext.newPage();
    const householdName = 'Screenshot Home';

    try {
      await signIn(ownerPage, owner);
      await expect(ownerPage.getByText('Create your first home')).toBeVisible();
      await capture(ownerPage, testInfo, '07-household-create');

      await createHousehold(ownerPage, householdName);
      await expect(ownerPage.getByLabel('Search items')).toBeVisible();
      await capture(ownerPage, testInfo, '08-inventory-empty');

      await ownerPage.getByRole('button', { name: 'Add your first item' }).click();
      await expect(ownerPage.getByLabel('Item name')).toBeVisible();
      await capture(ownerPage, testInfo, '09-inventory-add-form');
      await ownerPage.getByLabel('Item name').fill('Milk');
      await ownerPage.getByLabel('Quantity (optional)').fill('2');
      await ownerPage.getByLabel('Unit (optional)').fill('cartons');
      await ownerPage.getByLabel('Notes (optional)').fill('Full cream');
      await ownerPage.getByRole('button', { name: 'Add item', exact: true }).last().click();
      await expect(ownerPage.getByText('Milk was added.')).toBeVisible();
      await capture(ownerPage, testInfo, '10-inventory-populated');

      await ownerPage
        .getByTestId('inventory-item')
        .filter({ hasText: 'Milk' })
        .getByRole('button', { name: 'Edit' })
        .click();
      await expect(ownerPage.getByText('Edit Milk')).toBeVisible();
      await capture(ownerPage, testInfo, '11-inventory-edit-form');
      await ownerPage.getByRole('button', { name: 'Cancel' }).click();

      await ownerPage.getByRole('tab', { name: 'Shopping' }).click();
      await expect(ownerPage.getByText('Nothing left to pick up.')).toBeVisible();
      await capture(ownerPage, testInfo, '12-shopping-empty');

      await ownerPage.getByRole('button', { name: 'Add item' }).first().click();
      await expect(ownerPage.getByLabel('Note (optional)')).toBeVisible();
      await capture(ownerPage, testInfo, '13-shopping-add-form');
      await ownerPage.getByLabel('Item name').fill('Bread');
      await ownerPage.getByLabel('Quantity (optional)').fill('1');
      await ownerPage.getByLabel('Note (optional)').fill('Wholemeal');
      await ownerPage.getByRole('button', { name: 'Add to shopping' }).click();
      await expect(ownerPage.getByText('Bread was added to shopping.')).toBeVisible();
      await capture(ownerPage, testInfo, '14-shopping-populated');

      await ownerPage
        .getByTestId('shopping-entry')
        .filter({ hasText: 'Bread' })
        .getByRole('checkbox')
        .click();
      ownerPage.once('dialog', (dialog) => dialog.accept());
      await ownerPage.getByRole('button', { name: 'Finish shopping' }).click();
      await expect(ownerPage.getByText('Recent trips')).toBeVisible();
      await capture(ownerPage, testInfo, '15-shopping-trip-history');

      const invitation = await createInvitation(ownerPage);
      await signIn(memberPage, member);
      await expect(memberPage.getByText('Join with an invitation')).toBeVisible();
      await capture(memberPage, testInfo, '16-household-join');
      await joinHousehold(memberPage, invitation, householdName);

      // Clear the one-time invitation URL from owner UI state before capturing
      // evidence. Screenshot artifacts must never retain token material.
      await ownerPage.reload();
      await ownerPage.getByRole('tab', { name: 'Alerts' }).click();
      await expect(ownerPage.getByText(`${member.displayName} joined ${householdName}.`)).toBeVisible();
      await capture(ownerPage, testInfo, '17-alerts-owner');

      await ownerPage.getByRole('tab', { name: 'Settings' }).click();
      await expect(ownerPage.getByText(member.email, { exact: false })).toBeVisible();
      await capture(ownerPage, testInfo, '18-settings-owner');

      await memberPage.getByRole('tab', { name: 'Inventory' }).click();
      await expect(memberPage.getByTestId('inventory-item').filter({ hasText: 'Milk' })).toBeVisible();
      await capture(memberPage, testInfo, '19-inventory-member');

      await memberPage.getByRole('tab', { name: 'Shopping' }).click();
      await expect(memberPage.getByText('Recent trips')).toBeVisible();
      await capture(memberPage, testInfo, '20-shopping-member');

      await memberPage.getByRole('tab', { name: 'Alerts' }).click();
      await expect(memberPage.getByText('Notification preferences')).toBeVisible();
      await capture(memberPage, testInfo, '21-alerts-member');

      await memberPage.getByRole('tab', { name: 'Settings' }).click();
      await expect(memberPage.getByRole('button', { name: 'Leave household' })).toBeVisible();
      await capture(memberPage, testInfo, '22-settings-member');
    } finally {
      await ownerContext.close();
      await memberContext.close();
    }
  });
});
