import { AxeBuilder } from '@axe-core/playwright';

import { API_URL, expect, test } from '../fixtures/domi.js';

test('health, app shell, validation, and signed-out accessibility are healthy', async ({
  page,
  request,
}) => {
  const health = await request.get(`${API_URL}/api/v1/health`);
  expect(health.ok()).toBeTruthy();
  await expect(health.json()).resolves.toMatchObject({ status: 'ok' });

  await page.goto('/');
  await expect(page.getByText('Domi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email').fill('invalid');
  await page.getByLabel('Your name').fill('A');
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
