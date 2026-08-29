import { expect, test as base, type Page } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3100';
export const WEB_URL = process.env.E2E_WEB_URL ?? 'http://127.0.0.1:8082';
export const PASSWORD = 'Correct horse battery 42!';

export type TestUser = {
  displayName: string;
  email: string;
  password: string;
};

export const test = base.extend<{ makeUser: (label: string) => TestUser }>({
  makeUser: async ({}, use, testInfo) => {
    const run = `${Date.now()}-${testInfo.workerIndex}-${Math.random().toString(36).slice(2, 8)}`;
    await use((label) => ({
      displayName: `${label} ${run.slice(-6)}`,
      email: `e2e-${label.toLowerCase()}-${run}@example.test`,
      password: PASSWORD,
    }));
  },
});

export { expect };

export async function registerAndVerify(page: Page, user: TestUser): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Your name').fill(user.displayName);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByLabel('Confirm password').fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
  const token = await waitForMailToken(user.email, 'verify-email');
  await page.getByLabel('Verification token').fill(token);
  const householdsLoaded = waitForInitialHouseholds(page);
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await householdsLoaded;
  await expect(page.getByRole('heading', { name: `Hello, ${user.displayName}` })).toBeVisible();
}

export async function signIn(page: Page, user: TestUser): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  const householdsLoaded = waitForInitialHouseholds(page);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await householdsLoaded;
  await expect(page.getByRole('heading', { name: `Hello, ${user.displayName}` })).toBeVisible();
}

function waitForInitialHouseholds(page: Page) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === 'GET' &&
      url.pathname === '/api/v1/households' &&
      response.ok()
    );
  });
}

export async function createHousehold(page: Page, name: string): Promise<void> {
  await page.getByLabel('Household name').fill(name);
  await page.getByRole('button', { name: 'Create home' }).click();
  await expect(page.getByText(`${name} is ready.`)).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Inventory' })).toBeVisible();
}

export async function createInvitation(page: Page): Promise<string> {
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Create invitation' }).click();
  const invitation = page.getByText(/domi:\/\/join\?token=/);
  const url = await invitation.textContent();
  const token = new URL(url ?? '').searchParams.get('token');
  if (!token) throw new Error('Invitation token was not rendered.');
  return token;
}

export async function joinHousehold(page: Page, token: string, householdName: string): Promise<void> {
  await page.getByLabel('Invitation token').fill(token);
  await page.getByRole('button', { name: 'Join household' }).click();
  await expect(page.getByText(`You joined ${householdName}.`)).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(householdName) })).toBeVisible();
}

export async function sessionTokens(page: Page): Promise<{ accessToken: string; refreshToken: string }> {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem('domi.mobile-session.v1');
    if (!raw) throw new Error('No Domi browser session was found.');
    return JSON.parse(raw) as { accessToken: string; refreshToken: string };
  });
}

export async function waitForMailToken(
  email: string,
  route: 'verify-email' | 'reset-password',
): Promise<string> {
  const mailRoot = path.resolve(import.meta.dirname, '../../../services/api/tmp/mail');
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    const files = await readdir(mailRoot, { recursive: true, withFileTypes: true }).catch(() => []);
    for (const file of files) {
      if (!file.isFile()) continue;
      const filePath = path.join(file.parentPath, file.name);
      const contents = await readFile(filePath, 'utf8').catch(() => '');
      if (!contents.toLowerCase().includes(email.toLowerCase())) continue;
      const match = contents.match(new RegExp(`domi:\\/\\/${route}\\?token=([^\\s<]+)`));
      if (match?.[1]) return decodeURIComponent(match[1].replace(/=\r?\n/g, ''));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${route} mail to ${email}.`);
}
