import { expect, registerAndVerify, test, waitForMailToken } from '../fixtures/domi.js';

test('register, verify, sign out/in, and reset password', async ({ page, makeUser }) => {
  const user = makeUser('Auth');
  await registerAndVerify(page, user);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: `Hello, ${user.displayName}` })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email').fill(user.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText(/If that account exists/)).toBeVisible();
  const token = await waitForMailToken(user.email, 'reset-password');
  await page.getByRole('button', { name: 'I have a reset token' }).click();
  const nextPassword = 'A newer correct horse 43!';
  await page.getByLabel('Reset token').fill(token);
  await page.getByLabel('New password', { exact: true }).fill(nextPassword);
  await page.getByLabel('Confirm new password').fill(nextPassword);
  await page.getByRole('button', { name: 'Reset and sign in' }).click();
  await expect(page.getByRole('heading', { name: `Hello, ${user.displayName}` })).toBeVisible();
});
