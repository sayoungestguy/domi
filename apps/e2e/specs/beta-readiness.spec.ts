import { AxeBuilder } from '@axe-core/playwright';

import {
  API_URL,
  createHousehold,
  expect,
  sessionTokens,
  signIn,
  test,
} from '../fixtures/domi.js';
import { seedVerifiedUser } from '../scripts/users.js';

test('phone-sized and desktop signed-in surfaces meet accessibility and performance budgets', async ({
  page,
  makeUser,
  request,
}) => {
  const startupStartedAt = Date.now();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Domi' })).toBeVisible();
  expect(Date.now() - startupStartedAt).toBeLessThan(3_000);

  const user = makeUser('BetaReady');
  await seedVerifiedUser(user);
  await signIn(page, user);
  await createHousehold(page, `Accessible ${Date.now().toString().slice(-6)}`);

  for (const tab of ['Inventory', 'Shopping', 'Alerts', 'Settings']) {
    await page.getByRole('tab', { name: tab }).click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations, `${tab} accessibility violations`).toEqual([]);
  }

  const session = await sessionTokens(page);
  const durations: number[] = [];
  for (let index = 0; index < 20; index += 1) {
    const startedAt = Date.now();
    const response = await request.get(`${API_URL}/api/v1/households`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    durations.push(Date.now() - startedAt);
    expect(response.ok()).toBeTruthy();
  }
  durations.sort((left, right) => left - right);
  const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
  expect(p95).toBeLessThan(500);
});
